class RevOpsDashboard {
  constructor() {
    this.data = null;
    this.viewData = null;
    this.charts = {};
    this.currentView = 'overview';
    this.filters = {
      periodDays: 180,
      segment: 'all',
    };
    this.segmentMappings = {
      roiAdjustments: {
        SMB: 0.94,
        MM: 1.0,
        ENT: 1.08,
      },
      stuckDeals: {
        DEAL_0002: 'SMB',
        DEAL_0004: 'MM',
        DEAL_0006: 'SMB',
        DEAL_0007: 'ENT',
        DEAL_0010: 'MM',
        DEAL_0013: 'SMB',
        DEAL_0014: 'SMB',
        DEAL_0016: 'ENT',
        DEAL_0018: 'ENT',
        DEAL_0019: 'MM',
        DEAL_0123: 'ENT',
        DEAL_0456: 'MM',
      },
    };

    this.dom = {
      overview: {
        mrr: null,
        pipeline: null,
        roi: null,
        winrate: null,
        meta: {},
        highlights: {},
      },
      aiInsights: null,
      chatContainer: null,
    };

    this.statusBanner = null;
    this.overlay = null;
    this.overlayTargets = new Set();
    this.sidebarElement = null;
    this.sidebarToggle = null;
    this.aiDrawer = null;
    this.designToggleButtons = [];
    this.activeDesign = 'design-1';
    this.designStorageKey = 'revops-dashboard-design';
    this.init();
  }

  async init() {
    this.cacheElements();
    this.setupOverlayHandlers();
    this.setupKeyboardShortcuts();
    this.showStatus('Loading dashboard data…', 'info');

    try {
      await this.loadData();
      this.setupNavigation();
  this.setupInsightsDrawer();
      this.setupFilters();
      this.setupMobileNavigation();
  this.setupDesignToggle();
      this.updateViewData();
      this.clearStatus();
    } catch (error) {
      this.handleError(error);
    }
  }

  cacheElements() {
    this.statusBanner = document.getElementById('status-banner');
    this.overlay = document.getElementById('overlay');
    this.sidebarElement = document.getElementById('sidebar');
    this.sidebarToggle = document.getElementById('sidebar-toggle');
    this.aiDrawer = document.getElementById('ai-copilot-drawer');

    this.dom.overview = {
      mrr: document.getElementById('overview-mrr'),
      pipeline: document.getElementById('overview-pipeline'),
      roi: document.getElementById('overview-roi'),
      winrate: document.getElementById('overview-winrate'),
      meta: {
        mrr: document.getElementById('overview-mrr-meta'),
        pipeline: document.getElementById('overview-pipeline-meta'),
        roi: document.getElementById('overview-roi-meta'),
        winrate: document.getElementById('overview-winrate-meta'),
      },
      highlights: {
        topChannel: document.getElementById('overview-top-channel'),
        largestDeal: document.getElementById('overview-largest-deal'),
        topSegment: document.getElementById('overview-top-segment'),
      },
    };

    this.dom.aiInsights = document.getElementById('ai-insights-list');
    this.dom.chatContainer = document.getElementById('chat-container');
    this.designToggleButtons = Array.from(document.querySelectorAll('.design-toggle__btn'));
  }

  setupOverlayHandlers() {
    if (!this.overlay) return;

    this.overlay.addEventListener('click', () => {
      this.closeAICopilot();
      this.closeMobileSidebar();
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeAICopilot();
        this.closeMobileSidebar();
      }
    });
  }

  setOverlayActive(target, shouldActivate) {
    if (!target) return;

    const overlay = this.overlay ?? document.getElementById('overlay');
    if (!overlay) return;

    if (!this.overlayTargets) {
      this.overlayTargets = new Set();
    }

    if (shouldActivate) {
      this.overlayTargets.add(target);
      overlay.classList.add('active');
      document.body.classList.add('no-scroll');
    } else {
      this.overlayTargets.delete(target);
      if (this.overlayTargets.size === 0) {
        overlay.classList.remove('active');
        document.body.classList.remove('no-scroll');
      }
    }
  }

  closeAICopilot() {
    const drawer = this.aiDrawer ?? document.getElementById('ai-copilot-drawer');
    const trigger = document.getElementById('ai-copilot-btn');
    if (!drawer) return;

    if (drawer.classList.contains('open')) {
      drawer.classList.remove('open');
      this.setOverlayActive('copilot', false);
      trigger?.setAttribute('aria-expanded', 'false');
    }
  }

  closeMobileSidebar() {
    const sidebar = this.sidebarElement ?? document.getElementById('sidebar');
    const toggle = this.sidebarToggle ?? document.getElementById('sidebar-toggle');

    if (!sidebar) return;

    if (sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      this.setOverlayActive('sidebar', false);
    }

    toggle?.setAttribute('aria-expanded', 'false');
  }

  showStatus(message, type = 'info') {
    if (!this.statusBanner) return;

    this.statusBanner.classList.remove(
      'hidden',
      'status-banner--info',
      'status-banner--success',
      'status-banner--error',
    );

    if (!message) {
      this.statusBanner.classList.add('hidden');
      return;
    }

    this.statusBanner.textContent = message;
    this.statusBanner.classList.add(`status-banner--${type}`);
  }

  clearStatus() {
    this.showStatus('', 'info');
  }

  handleError(error) {
    console.error('[RevOpsDashboard] Failed to initialise', error);
    this.showStatus(
      'We hit a snag loading the dashboard data. Refresh the page or confirm that data/dashboard_data.json is accessible.',
      'error',
    );
  }

  async loadData() {
    const response = await fetch('data/dashboard_data.json', { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Unable to fetch dashboard data (HTTP ${response.status})`);
    }

    const raw = await response.json();
    this.data = this.normalizeData(raw);
  }

  normalizeData(raw = {}) {
    const marketing = raw.marketing ?? {};
    marketing.metrics = marketing.metrics ?? {};
    marketing.channelPerformance = Array.isArray(marketing.channelPerformance)
      ? marketing.channelPerformance
      : Object.values(marketing.channelPerformance ?? {});
    marketing.funnelData = Array.isArray(marketing.funnelData)
      ? marketing.funnelData
      : Object.entries(marketing.funnelData ?? {}).map(([stage, count]) => ({ stage, count }));
    marketing.trendsData = Array.isArray(marketing.trendsData) ? marketing.trendsData : [];

    const pipeline = raw.pipeline ?? {};
    pipeline.metrics = pipeline.metrics ?? {};
    let stageBreakdown = pipeline.stageBreakdown ?? [];
    if (!Array.isArray(stageBreakdown) && stageBreakdown) {
      stageBreakdown = Object.entries(stageBreakdown).map(([stage, values]) => ({
        stage,
        totalAmount:
          values?.totalAmount ?? values?.amount?.sum ?? values?.amount ?? values?.sum ?? 0,
        avgAmount: values?.avgAmount ?? values?.amount?.mean ?? values?.mean ?? 0,
        dealCount: values?.dealCount ?? values?.amount?.count ?? values?.count ?? 0,
        avgProbability:
          values?.avgProbability ?? values?.probability?.mean ?? values?.probability ?? 0,
        expectedValue:
          values?.expectedValue ?? values?.expected_value?.sum ?? values?.expected_value ?? 0,
      }));
    }
    pipeline.stageBreakdown = Array.isArray(stageBreakdown) ? stageBreakdown : [];
    pipeline.dealsBySegment = pipeline.dealsBySegment ?? {};
    pipeline.stuckDeals = Array.isArray(pipeline.stuckDeals) ? pipeline.stuckDeals : [];

    const revenue = raw.revenue ?? {};
    revenue.metrics = revenue.metrics ?? {};
    let segmentBreakdown = revenue.segmentBreakdown ?? [];
    if (!Array.isArray(segmentBreakdown) && segmentBreakdown) {
      segmentBreakdown = Object.entries(segmentBreakdown).map(([segment, values]) => ({
        segment,
        totalMRR: values?.totalMRR ?? values?.mrr ?? 0,
        newMRR: values?.newMRR ?? values?.new_mrr ?? 0,
        expansionMRR: values?.expansionMRR ?? values?.expansion_mrr ?? 0,
        contractionMRR: values?.contractionMRR ?? values?.contraction_mrr ?? 0,
        avgARPA: values?.avgARPA ?? values?.arpa ?? 0,
        avgNRR: values?.avgNRR ?? values?.nrr ?? 0,
        customerCount: values?.customerCount ?? values?.customers ?? 0,
      }));
    }
    revenue.segmentBreakdown = Array.isArray(segmentBreakdown) ? segmentBreakdown : [];
    revenue.mrrComponents = revenue.mrrComponents ?? {};
    revenue.trendsData = Array.isArray(revenue.trendsData) ? revenue.trendsData : [];

    return {
      marketing,
      pipeline,
      revenue,
      benchmarks: raw.benchmarks ?? [],
    };
  }

  updateViewData({ skipRender = false } = {}) {
    if (!this.data) return;
    this.viewData = this.computeFilteredData();
    if (!skipRender) {
      this.renderCurrentView();
    }
  }

  computeFilteredData() {
    const segmentKey = this.filters.segment;
    const periodDays = Number(this.filters.periodDays) || 180;

    const marketingTrends = this.filterByPeriod(
      this.data.marketing.trendsData,
      periodDays,
      'date',
    );
    const marketingPeriodFactor = this.getPeriodFactor(marketingTrends.length, this.data.marketing.trendsData.length);
    const marketingIntensity = this.getPeriodIntensity(marketingPeriodFactor);
    const marketingSegmentShare = this.getMarketingSegmentShare(segmentKey);

    const marketingMetrics = this.computeMarketingMetrics({
      trends: marketingTrends,
      intensity: marketingIntensity,
      segmentShare: marketingSegmentShare,
      periodFactor: marketingPeriodFactor,
    });
    const marketingChannels = this.computeChannelPerformance({
      intensity: marketingIntensity,
      segmentShare: marketingSegmentShare,
      periodFactor: marketingPeriodFactor,
    });
    const marketingFunnel = this.buildFunnelFromMetrics(marketingMetrics);
    const marketingTrendSeries = this.buildMarketingTrendSeries(marketingTrends, marketingSegmentShare);

    const pipelineSegmentShare = this.getPipelineSegmentShare(segmentKey);
    const pipelineIntensity = this.getPeriodIntensity(marketingPeriodFactor);
    const pipelineMetrics = this.computePipelineMetrics({
      intensity: pipelineIntensity,
      segmentShare: pipelineSegmentShare,
    });
    const pipelineStageBreakdown = this.computePipelineStages({
      intensity: pipelineIntensity,
      segmentShare: pipelineSegmentShare,
    });
    const pipelineSegments = this.computePipelineSegments({
      intensity: pipelineIntensity,
      segmentShare: pipelineSegmentShare,
      segmentKey,
    });
    const pipelineStuckDeals = this.computeStuckDeals(segmentKey);

    const revenueTrends = this.filterByPeriod(
      this.data.revenue.trendsData,
      periodDays,
      'month',
    );
    const revenuePeriodFactor = this.getPeriodFactor(revenueTrends.length, this.data.revenue.trendsData.length);
    const revenueIntensity = this.getPeriodIntensity(revenuePeriodFactor);
    const revenueMetrics = this.computeRevenueMetrics({
      intensity: revenueIntensity,
      segmentKey,
    });
    const revenueTrendSeries = this.buildRevenueTrendSeries(revenueTrends, segmentKey);
    const revenueSegments = this.computeRevenueSegments({
      intensity: revenueIntensity,
    });

    const overview = this.buildOverview({
      marketing: marketingMetrics,
      pipeline: pipelineMetrics,
      revenue: revenueMetrics,
      channels: marketingChannels,
      stuckDeals: pipelineStuckDeals,
      revenueSegments,
      revenueTrendSeries,
    });

    return {
      filters: { ...this.filters },
      marketing: {
        metrics: marketingMetrics,
        funnel: marketingFunnel,
        channels: marketingChannels,
        trends: marketingTrendSeries,
      },
      pipeline: {
        metrics: pipelineMetrics,
        stageBreakdown: pipelineStageBreakdown,
        dealsBySegment: pipelineSegments,
        stuckDeals: pipelineStuckDeals,
      },
      revenue: {
        metrics: revenueMetrics,
        trends: revenueTrendSeries,
        segmentTable: revenueSegments,
      },
      overview,
    };
  }

  filterByPeriod(data = [], periodDays, dateKey) {
    if (!Array.isArray(data) || data.length === 0) return [];
    const days = Number(periodDays);
    if (!days || days >= 365) {
      return data.slice();
    }

    const sorted = [...data].sort((a, b) => new Date(a[dateKey]) - new Date(b[dateKey]));
    const latestDate = new Date(sorted[sorted.length - 1][dateKey]);
    const windowMs = days * 24 * 60 * 60 * 1000;

    return sorted.filter((item) => {
      const itemDate = new Date(item[dateKey]);
      return latestDate - itemDate <= windowMs;
    });
  }

  getPeriodFactor(filteredLength, totalLength) {
    if (!totalLength) return 1;
    const factor = filteredLength / totalLength;
    return factor > 0 ? factor : 1 / (totalLength || 1);
  }

  getPeriodIntensity(factor) {
    const clamped = Math.max(0.25, Math.min(1, factor));
    return 0.6 * clamped + 0.4;
  }

  getMarketingSegmentShare(segmentKey) {
    if (!segmentKey || segmentKey === 'all') return 1;
    return this.getRevenueSegmentShare(segmentKey);
  }

  getPipelineSegmentShare(segmentKey) {
    if (!segmentKey || segmentKey === 'all') return 1;
    const dealsBySegment = this.data.pipeline.dealsBySegment ?? {};
    const total = Object.values(dealsBySegment).reduce((sum, value) => sum + value, 0);
    if (!total) return 1;
    return (dealsBySegment[segmentKey] ?? 0) / total || 0.3;
  }

  getRevenueSegmentShare(segmentKey) {
    if (!segmentKey || segmentKey === 'all') return 1;
    const segments = this.data.revenue.segmentBreakdown ?? [];
    const total = segments.reduce((sum, seg) => sum + (seg.totalMRR ?? 0), 0);
    if (!total) return 1;
    const entry = segments.find((seg) => seg.segment === segmentKey);
    return entry ? (entry.totalMRR ?? 0) / total : 0.3;
  }

  computeMarketingMetrics({ trends, intensity, segmentShare, periodFactor }) {
    const totals = trends.reduce(
      (acc, item) => {
        acc.leads += item.leads ?? 0;
        acc.mqls += item.MQLs ?? item.mqls ?? 0;
        acc.sqls += item.SQLs ?? item.sqls ?? 0;
        return acc;
      },
      { leads: 0, mqls: 0, sqls: 0 },
    );

    const base = this.data.marketing.metrics;
    const totalSpendBase = base.totalSpend ?? 0;
    const spend = totalSpendBase * intensity * segmentShare;

    const opportunityRatio = (base.totalOpportunities ?? 0) / Math.max(1, base.totalSQLs ?? 0);
    const closedWonRatio = (base.totalClosedWon ?? 0) / Math.max(1, base.totalOpportunities ?? 0);

    const totalOpportunities = totals.sqls * opportunityRatio * segmentShare;
    const totalClosedWon = totalOpportunities * closedWonRatio;

    const avgCAC = totals.leads > 0 ? spend / totals.leads : base.avgCAC ?? 0;

    const roiBase = base.avgROI ?? 0;
    const roiAdjustment = this.segmentMappings.roiAdjustments[this.filters.segment] ?? 1;
    const avgROI = roiBase * roiAdjustment * (0.85 + periodFactor * 0.3);

    return {
      totalSpend: spend,
      totalLeads: totals.leads * segmentShare,
      totalMQLs: totals.mqls * segmentShare,
      totalSQLs: totals.sqls * segmentShare,
      totalOpportunities,
      totalClosedWon,
      avgCAC,
      avgROI,
    };
  }

  computeChannelPerformance({ intensity, segmentShare, periodFactor }) {
    return (this.data.marketing.channelPerformance ?? []).map((channel) => {
      const spend = (channel.spend ?? 0) * intensity * segmentShare;
      const leads = (channel.leads ?? 0) * intensity * segmentShare;
      const mqls = (channel.MQLs ?? 0) * intensity * segmentShare;
      const sqls = (channel.SQLs ?? 0) * intensity * segmentShare;
      const opportunities = (channel.opportunities ?? 0) * intensity * segmentShare;
      const closedWon = (channel.closed_won ?? 0) * intensity * segmentShare;
      const roiBase = channel.ROI ?? 0;
      const roiAdjustment = this.segmentMappings.roiAdjustments[this.filters.segment] ?? 1;
      const roi = roiBase * roiAdjustment * (0.85 + periodFactor * 0.25);
      const cac = leads > 0 ? spend / leads : channel.CAC ?? 0;

      return {
        channel: channel.channel,
        spend,
        leads,
        MQLs: mqls,
        SQLs: sqls,
        opportunities,
        closed_won: closedWon,
        ROI: roi,
        CAC: cac,
      };
    });
  }

  buildFunnelFromMetrics(metrics) {
    return [
      { stage: 'Leads', count: metrics.totalLeads ?? 0 },
      { stage: 'MQLs', count: metrics.totalMQLs ?? 0 },
      { stage: 'SQLs', count: metrics.totalSQLs ?? 0 },
      { stage: 'Opportunities', count: metrics.totalOpportunities ?? 0 },
      { stage: 'Closed Won', count: metrics.totalClosedWon ?? 0 },
    ];
  }

  buildMarketingTrendSeries(trends, segmentShare) {
    if (!Array.isArray(trends) || trends.length === 0) return [];
    return trends.map((item) => ({
      date: item.date,
      leads: (item.leads ?? 0) * segmentShare,
      MQLs: (item.MQLs ?? item.mqls ?? 0) * segmentShare,
      SQLs: (item.SQLs ?? item.sqls ?? 0) * segmentShare,
    }));
  }

  computePipelineMetrics({ intensity, segmentShare }) {
    const base = this.data.pipeline.metrics;
    const dealFactor = Math.max(0.35, segmentShare * intensity);

    const totalPipeline = (base.totalPipeline ?? 0) * intensity * segmentShare;
    const weightedPipeline = (base.weightedPipeline ?? 0) * intensity * segmentShare;
    const totalDeals = Math.max(
      1,
      Math.round((base.totalDeals ?? 0) * dealFactor),
    );
    const avgDealSize = totalDeals > 0 ? totalPipeline / totalDeals : base.avgDealSize ?? 0;

    const winRateBase = base.winRate ?? 0;
    const winRate = this.clamp(
      winRateBase * (0.85 + segmentShare * 0.3) * (0.85 + intensity * 0.3),
      3,
      95,
    );

    return {
      totalPipeline,
      weightedPipeline,
      avgDealSize,
      totalDeals,
      winRate,
    };
  }

  computePipelineStages({ intensity, segmentShare }) {
    return (this.data.pipeline.stageBreakdown ?? []).map((stage) => {
      const amount = (stage.totalAmount ?? 0) * intensity * segmentShare;
      const deals = Math.max(1, Math.round((stage.dealCount ?? 0) * Math.max(0.3, segmentShare)));
      const avgAmount = deals > 0 ? amount / deals : stage.avgAmount ?? 0;

      return {
        stage: stage.stage,
        totalAmount: amount,
        dealCount: deals,
        avgAmount,
        avgProbability: stage.avgProbability ?? 0,
        expectedValue: (stage.expectedValue ?? 0) * intensity * segmentShare,
      };
    });
  }

  computePipelineSegments({ intensity, segmentShare, segmentKey }) {
    const segments = this.data.pipeline.dealsBySegment ?? {};
    if (segmentKey && segmentKey !== 'all') {
      const value = (segments[segmentKey] ?? 0) * intensity;
      return { [segmentKey]: value };
    }

    return Object.fromEntries(
      Object.entries(segments).map(([key, value]) => [key, value * intensity]),
    );
  }

  computeStuckDeals(segmentKey) {
    const deals = this.data.pipeline.stuckDeals ?? [];
    if (!segmentKey || segmentKey === 'all') {
      return deals.slice();
    }

    return deals.filter((deal) => {
      const mappedSegment = this.segmentMappings.stuckDeals[deal.dealId];
      return mappedSegment === segmentKey;
    });
  }

  computeRevenueMetrics({ intensity, segmentKey }) {
    const base = this.data.revenue.metrics;
    const segmentInfo = this.getRevenueSegmentEntry(segmentKey) ?? {};

    const totalMRRBase = segmentKey && segmentKey !== 'all' ? segmentInfo.totalMRR ?? 0 : base.totalMRR ?? 0;
    const totalMRR = totalMRRBase * intensity;
    const totalARR = totalMRR * 12;

    const avgNRRBase = segmentKey && segmentKey !== 'all' ? segmentInfo.avgNRR ?? 0 : base.avgNRR ?? 0;
    const avgNRR = avgNRRBase;

    const churnRateBase = base.churnRate ?? 0;
    const churnRate = segmentKey && segmentKey !== 'all'
      ? churnRateBase * (0.9 + this.getRevenueSegmentShare(segmentKey) * 0.3)
      : churnRateBase * intensity;

    const newMrrBase = segmentKey && segmentKey !== 'all'
      ? segmentInfo.newMRR ?? 0
      : base.mrrComponents?.new_mrr ?? segmentInfo.newMRR ?? 0;
    const expansionMrrBase = segmentKey && segmentKey !== 'all'
      ? segmentInfo.expansionMRR ?? 0
      : base.mrrComponents?.expansion_mrr ?? segmentInfo.expansionMRR ?? 0;
    const contractionMrrBase = segmentKey && segmentKey !== 'all'
      ? segmentInfo.contractionMRR ?? 0
      : base.mrrComponents?.contraction_mrr ?? segmentInfo.contractionMRR ?? 0;

    return {
      totalMRR,
      totalARR,
      avgNRR,
      churnRate,
      mrrComponents: {
        new_mrr: newMrrBase * intensity,
        expansion_mrr: expansionMrrBase * intensity,
        contraction_mrr: contractionMrrBase * intensity,
      },
    };
  }

  buildRevenueTrendSeries(trends, segmentKey) {
    if (!Array.isArray(trends) || trends.length === 0) return [];
    const share = this.getRevenueSegmentShare(segmentKey);
    return trends.map((item) => ({
      month: item.month,
      mrr: (item.mrr ?? 0) * share,
    }));
  }

  computeRevenueSegments({ intensity }) {
    return (this.data.revenue.segmentBreakdown ?? []).map((segment) => ({
      segment: segment.segment,
      totalMRR: (segment.totalMRR ?? 0) * intensity,
      customerCount: segment.customerCount ?? 0,
      avgARPA: segment.avgARPA ?? 0,
      avgNRR: segment.avgNRR ?? 0,
      expansionMRR: (segment.expansionMRR ?? 0) * intensity,
    }));
  }

  getRevenueSegmentEntry(segmentKey) {
    if (!segmentKey || segmentKey === 'all') return null;
    return (this.data.revenue.segmentBreakdown ?? []).find((segment) => segment.segment === segmentKey) ?? null;
  }

  buildOverview({ marketing, pipeline, revenue, channels, stuckDeals, revenueSegments, revenueTrendSeries }) {
    const topChannel = this.getTopEntity(channels, 'ROI');
    const largestDeal = this.getTopEntity(stuckDeals, 'amount');
    const topSegment = this.getTopEntity(revenueSegments, 'totalMRR');

    const mrrMeta = this.getTrendMeta(revenueTrendSeries, 'mrr');
    const pipelineMeta = `Weighted: ${this.formatCurrency(pipeline.weightedPipeline ?? 0)}`;
    const roiMeta = `${channels.length} channels active`;
    const winrateMeta = `${this.formatNumber(Math.round(pipeline.totalDeals ?? 0))} total deals`;

    return {
      metrics: {
        totalMRR: revenue.totalMRR ?? 0,
        pipelineValue: pipeline.totalPipeline ?? 0,
        marketingROI: marketing.avgROI ?? 0,
        winRate: pipeline.winRate ?? 0,
      },
      meta: {
        mrr: mrrMeta,
        pipeline: pipelineMeta,
        roi: roiMeta,
        winrate: winrateMeta,
      },
      highlights: {
        topChannel: topChannel
          ? `${topChannel.channel} (${topChannel.ROI?.toFixed(1) ?? '0.0'}% ROI)`
          : 'No channel data',
        largestDeal: largestDeal
          ? `${this.formatCurrency(largestDeal.amount ?? 0)} (${largestDeal.account ?? ''})`
          : 'No stuck deals 🎉',
        topSegment: topSegment
          ? `${topSegment.segment} (${this.formatCurrency(topSegment.totalMRR ?? 0)} MRR)`
          : 'No segment data',
      },
    };
  }

  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const view = link.getAttribute('data-view');
        this.switchView(view);
      });
    });
  }

  switchView(view) {
    if (!view || view === this.currentView) return;

    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('data-view') === view);
    });

    document.querySelectorAll('.view-content').forEach((content) => {
      content.classList.toggle('active', content.id === `${view}-view`);
    });

    const titles = {
      overview: 'Overview Dashboard',
      marketing: 'Marketing Performance',
      pipeline: 'Sales Pipeline',
      revenue: 'Revenue Analytics',
    };

    document.getElementById('page-title').textContent = titles[view] ?? 'RevOps Dashboard';
    document.getElementById('current-view').textContent =
      view.charAt(0).toUpperCase() + view.slice(1);

    this.currentView = view;
    this.renderCurrentView();
  }

  renderCurrentView() {
    if (!this.viewData) {
      this.updateViewData({ skipRender: true });
    }
    if (!this.viewData) return;

    switch (this.currentView) {
      case 'overview':
        this.renderOverview();
        break;
      case 'marketing':
        this.renderMarketing();
        break;
      case 'pipeline':
        this.renderPipeline();
        break;
      case 'revenue':
        this.renderRevenue();
        break;
      default:
        this.renderOverview();
    }
  }

  renderOverview() {
    const overview = this.viewData.overview;
    const marketing = this.viewData.marketing;
    const pipeline = this.viewData.pipeline;

    this.setText(this.dom.overview.mrr, this.formatCurrency(overview.metrics.totalMRR));
    this.setText(
      this.dom.overview.pipeline,
      this.formatCurrency(overview.metrics.pipelineValue),
    );
    this.setText(
      this.dom.overview.roi,
      `${overview.metrics.marketingROI?.toFixed(1) ?? '0.0'}%`,
    );
    this.setText(
      this.dom.overview.winrate,
      `${overview.metrics.winRate?.toFixed(1) ?? '0.0'}%`,
    );

    this.setMeta(this.dom.overview.meta.mrr, overview.meta.mrr);
    this.setMeta(this.dom.overview.meta.pipeline, overview.meta.pipeline);
    this.setMeta(this.dom.overview.meta.roi, overview.meta.roi);
    this.setMeta(this.dom.overview.meta.winrate, overview.meta.winrate);

    this.setText(this.dom.overview.highlights.topChannel, overview.highlights.topChannel);
    this.setText(this.dom.overview.highlights.largestDeal, overview.highlights.largestDeal);
    this.setText(this.dom.overview.highlights.topSegment, overview.highlights.topSegment);

    this.renderAIInsights();
  }

  renderMarketing() {
    const marketing = this.viewData.marketing;
    const metrics = marketing.metrics;

    this.setText(document.getElementById('marketing-spend'), this.formatCurrency(metrics.totalSpend ?? 0));
    this.setText(document.getElementById('marketing-leads'), this.formatNumber(Math.round(metrics.totalLeads ?? 0)));
    this.setText(
      document.getElementById('marketing-cac'),
      metrics.avgCAC ? `$${metrics.avgCAC.toFixed(2)}` : '—',
    );
    this.setText(
      document.getElementById('marketing-roi'),
      metrics.avgROI ? `${metrics.avgROI.toFixed(1)}%` : '—',
    );

    this.renderFunnelChart(marketing.funnel);
    this.renderChannelChart(marketing.channels);
    this.renderTrendsChart(marketing.trends);
    this.renderChannelTable(marketing.channels);
  }

  renderPipeline() {
    const pipeline = this.viewData.pipeline;
    const metrics = pipeline.metrics;

    this.setText(
      document.getElementById('pipeline-total'),
      this.formatCurrency(metrics.totalPipeline ?? 0),
    );
    this.setText(
      document.getElementById('pipeline-weighted'),
      this.formatCurrency(metrics.weightedPipeline ?? 0),
    );
    this.setText(
      document.getElementById('pipeline-dealsize'),
      this.formatCurrency(metrics.avgDealSize ?? 0),
    );
    this.setText(
      document.getElementById('pipeline-winrate'),
      `${metrics.winRate?.toFixed(1) ?? '0.0'}%`,
    );

    this.renderPipelineStageChart(pipeline.stageBreakdown);
    this.renderPipelineSegmentChart(pipeline.dealsBySegment);
    this.renderStuckDeals();
  }

  renderRevenue() {
    const revenue = this.viewData.revenue;
    const metrics = revenue.metrics;

    this.setText(
      document.getElementById('revenue-mrr'),
      this.formatCurrency(metrics.totalMRR ?? 0),
    );
    this.setText(
      document.getElementById('revenue-arr'),
      this.formatCurrency(metrics.totalARR ?? 0),
    );
    this.setText(
      document.getElementById('revenue-nrr'),
      metrics.avgNRR ? `${(metrics.avgNRR * 100).toFixed(1)}%` : '—',
    );
    this.setText(
      document.getElementById('revenue-churn'),
      `${metrics.churnRate?.toFixed(1) ?? '0.0'}%`,
    );

    this.renderRevenueSegmentChart(revenue.segmentTable);
    this.renderRevenueTrendChart(revenue.trends);
    this.renderSegmentTable(revenue.segmentTable);
  }

  renderFunnelChart(funnelData) {
    const ctx = document.getElementById('funnel-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    this.destroyChart('funnel');

    this.charts.funnel = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: funnelData.map((item) => item.stage),
        datasets: [
          {
            label: 'Count',
            data: funnelData.map((item) => item.count),
            backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F'],
            borderColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F'],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#a7a9a9' },
            grid: { color: 'rgba(167, 169, 169, 0.2)' },
          },
          x: {
            ticks: { color: '#a7a9a9' },
            grid: { color: 'rgba(167, 169, 169, 0.2)' },
          },
        },
      },
    });
  }

  renderChannelChart(channels) {
    const ctx = document.getElementById('channel-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    this.destroyChart('channel');

    this.charts.channel = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: channels.map((ch) => ch.channel),
        datasets: [
          {
            label: 'ROI (%)',
            data: channels.map((ch) => ch.ROI ?? 0),
            backgroundColor: '#1FB8CD',
            borderColor: '#1FB8CD',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#a7a9a9' },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#a7a9a9' },
            grid: { color: 'rgba(167, 169, 169, 0.2)' },
          },
          x: {
            ticks: { color: '#a7a9a9' },
            grid: { color: 'rgba(167, 169, 169, 0.2)' },
          },
        },
      },
    });
  }

  renderTrendsChart(trends) {
    const ctx = document.getElementById('trends-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    this.destroyChart('trends');

    const labels = trends.map((t) =>
      new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    );

    this.charts.trends = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Leads',
            data: trends.map((t) => t.leads ?? 0),
            borderColor: '#1FB8CD',
            backgroundColor: 'rgba(31, 184, 205, 0.1)',
            tension: 0.4,
          },
          {
            label: 'MQLs',
            data: trends.map((t) => t.MQLs ?? 0),
            borderColor: '#FFC185',
            backgroundColor: 'rgba(255, 193, 133, 0.1)',
            tension: 0.4,
          },
          {
            label: 'SQLs',
            data: trends.map((t) => t.SQLs ?? 0),
            borderColor: '#B4413C',
            backgroundColor: 'rgba(180, 65, 60, 0.1)',
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#a7a9a9' },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#a7a9a9' },
            grid: { color: 'rgba(167, 169, 169, 0.2)' },
          },
          x: {
            ticks: { color: '#a7a9a9' },
            grid: { color: 'rgba(167, 169, 169, 0.2)' },
          },
        },
      },
    });
  }

  renderChannelTable(channels) {
    const tbody = document.querySelector('#channel-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    channels.forEach((channel) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${channel.channel}</td>
        <td>${this.formatCurrency(channel.spend ?? 0)}</td>
        <td>${this.formatNumber(Math.round(channel.leads ?? 0))}</td>
        <td>${this.formatNumber(Math.round(channel.MQLs ?? 0))}</td>
        <td>${this.formatNumber(Math.round(channel.SQLs ?? 0))}</td>
        <td>$${channel.CAC ? channel.CAC.toFixed(2) : '0.00'}</td>
        <td>${channel.ROI ? channel.ROI.toFixed(1) : '0.0'}%</td>
        <td>${this.formatNumber(Math.round(channel.opportunities ?? 0))}</td>
        <td>${this.formatNumber(Math.round(channel.closed_won ?? 0))}</td>
      `;
      tbody.appendChild(row);
    });
  }

  renderPipelineStageChart(stages) {
    const ctx = document.getElementById('pipeline-stage-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    this.destroyChart('pipelineStage');

    this.charts.pipelineStage = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: stages.map((stage) => stage.stage),
        datasets: [
          {
            label: 'Pipeline Value',
            data: stages.map((stage) => stage.totalAmount ?? 0),
            backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C'],
            borderColor: ['#1FB8CD', '#FFC185', '#B4413C'],
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#a7a9a9' },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: '#a7a9a9',
              callback: (value) => `$${(value / 1_000_000).toFixed(1)}M`,
            },
            grid: { color: 'rgba(167, 169, 169, 0.2)' },
          },
          y: {
            ticks: { color: '#a7a9a9' },
            grid: { color: 'rgba(167, 169, 169, 0.2)' },
          },
        },
      },
    });
  }

  renderPipelineSegmentChart(segments) {
    const ctx = document.getElementById('pipeline-segment-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    this.destroyChart('pipelineSegment');

    const labels = Object.keys(segments);
    const values = Object.values(segments);

    this.charts.pipelineSegment = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C'],
            borderColor: ['#1FB8CD', '#FFC185', '#B4413C'],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#a7a9a9' },
          },
        },
      },
    });
  }

  renderStuckDeals() {
    const container = document.getElementById('stuck-deals-list');
    if (!container) return;

    container.innerHTML = '';

    const deals = this.viewData.pipeline.stuckDeals ?? [];

    if (deals.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'stuck-deal-item';
      emptyState.innerHTML = `
        <div class="deal-info">
          <div class="deal-id">No stuck deals 🎉</div>
          <div class="deal-details">All active opportunities are moving within 45 days.</div>
        </div>
      `;
      container.appendChild(emptyState);
      return;
    }

    deals
      .slice()
      .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
      .forEach((deal) => {
        const dealElement = document.createElement('div');
        dealElement.className = 'stuck-deal-item';
        dealElement.innerHTML = `
          <div class="deal-info">
            <div class="deal-id">${deal.dealId}</div>
            <div class="deal-details">${deal.account} • ${deal.stage} • ${deal.daysInStage} days • ${deal.owner}</div>
          </div>
          <div class="deal-amount">${this.formatCurrency(deal.amount ?? 0)}</div>
        `;
        container.appendChild(dealElement);
      });
  }

  renderRevenueSegmentChart(segments) {
    const ctx = document.getElementById('revenue-segment-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    this.destroyChart('revenueSegment');

    this.charts.revenueSegment = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: segments.map((seg) => seg.segment),
        datasets: [
          {
            data: segments.map((seg) => seg.totalMRR ?? 0),
            backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C'],
            borderColor: ['#1FB8CD', '#FFC185', '#B4413C'],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#a7a9a9' },
          },
        },
      },
    });
  }

  renderRevenueTrendChart(trends) {
    const ctx = document.getElementById('revenue-trend-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    this.destroyChart('revenueTrend');

    const labels = trends.map((t) =>
      new Date(t.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    );

    this.charts.revenueTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'MRR',
            data: trends.map((t) => t.mrr ?? 0),
            borderColor: '#1FB8CD',
            backgroundColor: 'rgba(31, 184, 205, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#a7a9a9' },
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              color: '#a7a9a9',
              callback: (value) => `$${(value / 1_000_000).toFixed(1)}M`,
            },
            grid: { color: 'rgba(167, 169, 169, 0.2)' },
          },
          x: {
            ticks: { color: '#a7a9a9' },
            grid: { color: 'rgba(167, 169, 169, 0.2)' },
          },
        },
      },
    });
  }

  renderSegmentTable(segments) {
    const tbody = document.querySelector('#segment-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    segments.forEach((segment) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${segment.segment}</td>
        <td>${this.formatCurrency(segment.totalMRR ?? 0)}</td>
        <td>${this.formatNumber(segment.customerCount ?? 0)}</td>
        <td>${this.formatCurrency(segment.avgARPA ?? 0)}</td>
        <td>${segment.avgNRR ? (segment.avgNRR * 100).toFixed(1) : '0.0'}%</td>
        <td>${this.formatCurrency(segment.expansionMRR ?? 0)}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Setup Insights Drawer (formerly AI Co-Pilot)
  setupInsightsDrawer() {
    const insightsBtn = document.getElementById('ai-copilot-btn');
    const drawer = document.getElementById('ai-copilot-drawer');
    const closeBtn = document.getElementById('close-copilot');
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    this.aiDrawer = drawer;

    insightsBtn?.addEventListener('click', () => {
      this.closeMobileSidebar();
      drawer?.classList.add('open');
      this.setOverlayActive('copilot', true);
      insightsBtn.setAttribute('aria-expanded', 'true');
    });

    closeBtn?.addEventListener('click', () => {
      this.closeAICopilot();
    });

    sendBtn?.addEventListener('click', () => {
      this.sendMessage();
    });

    chatInput?.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.sendMessage();
      }
    });

    document.querySelectorAll('.query-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!chatInput) return;
        const query = btn.getAttribute('data-query');
        chatInput.value = query;
        this.sendMessage();
      });
    });
  }

  sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput?.value.trim();
    const chatContainer = this.dom.chatContainer;

    if (!message || !chatContainer) return;

    const userMessage = document.createElement('div');
    userMessage.className = 'chat-message user-message';
    userMessage.innerHTML = `<p>${message}</p>`;
    chatContainer.appendChild(userMessage);

    const aiResponse = this.generateAIResponse(message);
    const aiMessage = document.createElement('div');
    aiMessage.className = 'chat-message ai-message';
    aiMessage.innerHTML = `<p>${aiResponse}</p>`;
    chatContainer.appendChild(aiMessage);

    chatInput.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  generateAIResponse(message) {
    if (!this.viewData) {
      return 'Data is still loading. Hang tight for a second!';
    }

    const text = message.toLowerCase();
    const topChannel = this.getTopEntity(this.viewData.marketing.channels, 'ROI');
    const largestDeal = this.getTopEntity(this.viewData.pipeline.stuckDeals, 'amount');
    const topSegment = this.getTopEntity(this.viewData.revenue.segmentTable, 'totalMRR');
    const revenueTrend = this.getTrendMeta(this.viewData.revenue.trends, 'mrr');

    if (text.includes('best') && text.includes('channel') && topChannel) {
      return `${topChannel.channel} is leading with ${topChannel.ROI?.toFixed(
        1,
      )}% ROI on ${this.formatCurrency(topChannel.spend ?? 0)} spend and ${this.formatNumber(
        Math.round(topChannel.closed_won ?? 0),
      )} closed-won deals.`;
    }

    if (text.includes('deal') && largestDeal) {
      return `Keep an eye on ${largestDeal.dealId}: ${this.formatCurrency(
        largestDeal.amount ?? 0,
      )} in ${largestDeal.stage} for ${largestDeal.account}, stuck ${largestDeal.daysInStage} days.`;
    }

    if (text.includes('revenue') || text.includes('mrr')) {
      return `MRR totals ${this.formatCurrency(
        this.viewData.revenue.metrics.totalMRR ?? 0,
      )}. Trend: ${revenueTrend}. Churn rate stands at ${this.viewData.revenue.metrics.churnRate?.toFixed(
        1,
      ) ?? '0.0'}%.`;
    }

    if (text.includes('segment') && topSegment) {
      const share = this.calculateShare(
        topSegment.totalMRR ?? 0,
        this.viewData.revenue.segmentTable.reduce((sum, seg) => sum + (seg.totalMRR ?? 0), 0),
      );
      return `${topSegment.segment} dominates with ${this.formatCurrency(
        topSegment.totalMRR ?? 0,
      )} MRR (${share.toFixed(1)}% share) and ${this.formatNumber(
        topSegment.customerCount ?? 0,
      )} customers.`;
    }

    return `Here's the snapshot: total MRR ${this.formatCurrency(
      this.viewData.revenue.metrics.totalMRR ?? 0,
    )}, pipeline ${this.formatCurrency(
      this.viewData.pipeline.metrics.totalPipeline ?? 0,
    )}, win rate ${this.viewData.pipeline.metrics.winRate?.toFixed(1) ?? '0.0'}%, marketing ROI ${
      this.viewData.marketing.metrics.avgROI?.toFixed(1) ?? '0.0'
    }%. Ask about channels, deals, or segments for deeper insights!`;
  }

  setupFilters() {
    const dateFilter = document.getElementById('date-filter');
    const segmentFilter = document.getElementById('segment-filter');

    dateFilter?.addEventListener('change', () => {
      this.filters.periodDays = Number(dateFilter.value);
      this.updateViewData();
    });

    segmentFilter?.addEventListener('change', () => {
      this.filters.segment = segmentFilter.value;
      this.updateViewData();
    });
  }

  setupMobileNavigation() {
    const sidebar = this.sidebarElement ?? document.getElementById('sidebar');
    const toggle = this.sidebarToggle ?? document.getElementById('sidebar-toggle');

    if (!sidebar || !toggle) return;

    this.sidebarElement = sidebar;
    this.sidebarToggle = toggle;

    const handleToggle = () => {
      const isOpen = sidebar.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      this.setOverlayActive('sidebar', isOpen);

      if (isOpen) {
        this.closeAICopilot();
      }
    };

    toggle.addEventListener('click', handleToggle);

    sidebar.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          this.closeMobileSidebar();
        }
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) {
        sidebar.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        this.setOverlayActive('sidebar', false);
      }
    });
  }

  setupDesignToggle() {
    const body = document.body;
    if (!body) return;

    const savedDesign = this.getSavedDesign();
    const initialDesign = savedDesign || this.activeDesign || 'design-1';

    if (Array.isArray(this.designToggleButtons) && this.designToggleButtons.length > 0) {
      this.designToggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const design = button.getAttribute('data-design');
          if (!design) return;
          this.applyDesign(design);
        });
      });
    }

    this.applyDesign(initialDesign, { persist: false });
  }

  applyDesign(design, { persist = true } = {}) {
    const body = document.body;
    if (!body) return;

    const validDesigns = new Set(['design-1', 'design-2']);
    const normalized = validDesigns.has(design) ? design : 'design-1';

    body.classList.remove('design-1', 'design-2');
    body.classList.add(normalized);
    body.setAttribute('data-dashboard-design', normalized);

    this.activeDesign = normalized;
    this.updateDesignButtons(normalized);

    if (persist) {
      this.saveDesign(normalized);
    }

    if (normalized === 'design-2') {
      this.closeMobileSidebar();
    }
  }

  updateDesignButtons(activeDesign) {
    if (!Array.isArray(this.designToggleButtons)) return;

    this.designToggleButtons.forEach((button) => {
      const design = button.getAttribute('data-design');
      const isActive = design === activeDesign;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  getSavedDesign() {
    try {
      return localStorage.getItem(this.designStorageKey) || null;
    } catch (error) {
      return null;
    }
  }

  saveDesign(design) {
    try {
      localStorage.setItem(this.designStorageKey, design);
    } catch (error) {
      // Ignore storage errors (private mode, etc.)
    }
  }

  renderAIInsights() {
    if (!this.dom.aiInsights) return;
    this.dom.aiInsights.innerHTML = '';

    const insights = this.buildInsights();

    insights.forEach((insight) => {
      const item = document.createElement('div');
      item.className = 'insight-item';
      item.innerHTML = `
        <span class="insight-icon">${insight.icon}</span>
        <p>${insight.text}</p>
      `;
      this.dom.aiInsights.appendChild(item);
    });
  }

  buildInsights() {
    const insights = [];

    const stuckDeals = this.viewData.pipeline.stuckDeals ?? [];
    const largestDeal = this.getTopEntity(stuckDeals, 'amount');
    const channels = this.viewData.marketing.channels ?? [];
    const topChannel = this.getTopEntity(channels, 'ROI');
    const revenueSegments = this.viewData.revenue.segmentTable ?? [];
    const topSegment = this.getTopEntity(revenueSegments, 'totalMRR');
    const revenueTrend = this.getTrendMeta(this.viewData.revenue.trends, 'mrr');

    if (stuckDeals.length > 0 && largestDeal) {
      insights.push({
        icon: '⚠️',
        text: `${stuckDeals.length} deals are stuck 45+ days. Biggest: ${largestDeal.dealId} worth ${this.formatCurrency(
          largestDeal.amount ?? 0,
        )} in ${largestDeal.stage}.`,
      });
    } else {
      insights.push({
        icon: '✅',
        text: 'No deals are stuck beyond 45 days. Pipeline velocity looks healthy.',
      });
    }

    if (topChannel) {
      insights.push({
        icon: '📈',
        text: `${topChannel.channel} leads marketing with ${topChannel.ROI?.toFixed(
          1,
        )}% ROI on ${this.formatCurrency(topChannel.spend ?? 0)} spend.`,
      });
    }

    if (topSegment) {
      const share = this.calculateShare(
        topSegment.totalMRR ?? 0,
        revenueSegments.reduce((sum, seg) => sum + (seg.totalMRR ?? 0), 0),
      );
      insights.push({
        icon: '💡',
        text: `${topSegment.segment} generates ${share.toFixed(
          1,
        )}% of MRR (${this.formatCurrency(topSegment.totalMRR ?? 0)}).`,
      });
    }

    insights.push({ icon: '🚀', text: `MRR momentum: ${revenueTrend}.` });

    return insights;
  }

  destroyChart(key) {
    if (this.charts[key]) {
      this.charts[key].destroy();
      delete this.charts[key];
    }
  }

  setMeta(element, text) {
    if (!element) return;
    element.textContent = text || '—';
  }

  setText(element, text) {
    if (!element) return;
    element.textContent = text ?? '—';
  }

  getTopEntity(list, key) {
    if (!Array.isArray(list) || list.length === 0) return null;
    return list.reduce((best, item) => {
      if (!best) return item;
      return (item[key] ?? 0) > (best[key] ?? 0) ? item : best;
    }, null);
  }

  getTrendMeta(trends = [], key) {
    if (!Array.isArray(trends) || trends.length < 2) return 'Tracking…';

    const latest = trends[trends.length - 1]?.[key];
    const previous = trends[trends.length - 2]?.[key];

    if (!this.isNumber(latest) || !this.isNumber(previous) || previous === 0) {
      return `${this.formatCurrency(latest ?? 0)} current`;
    }

    const delta = ((latest - previous) / Math.abs(previous)) * 100;
    const direction = delta >= 0 ? '▲' : '▼';
    return `${direction} ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs prior month`;
  }

  calculateShare(part, total) {
    if (!this.isNumber(part) || !this.isNumber(total) || total === 0) return 0;
    return (part / total) * 100;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  formatCurrency(value) {
    if (!this.isNumber(value)) return '$0.00';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (abs >= 1_000_000_000) {
      return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    }
    if (abs >= 1_000_000) {
      return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    }
    return `${sign}$${abs.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  formatNumber(value) {
    if (!this.isNumber(value)) return '—';
    return Math.round(value).toLocaleString();
  }

  isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new RevOpsDashboard();
});

window.addEventListener('resize', () => {
  // Reserved for future custom resize logic
});