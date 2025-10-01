# Fix the JSON serialization issue by flattening the multi-level columns
import json
from datetime import datetime, timedelta

print("Creating properly formatted dashboard data...")

# Process Marketing data
marketing_metrics = {
    'totalSpend': float(marketing_channels['spend'].sum()),
    'totalLeads': int(marketing_channels['leads'].sum()),
    'totalMQLs': int(marketing_channels['MQLs'].sum()),
    'totalSQLs': int(marketing_channels['SQLs'].sum()),
    'totalOpportunities': int(marketing_channels['opportunities'].sum()),
    'totalClosedWon': int(marketing_channels['closed_won'].sum()),
    'avgCAC': float(marketing_channels['CAC'].mean()),
    'avgROI': float(marketing_channels['ROI'].mean())
}

# Channel performance summary
channel_performance = marketing_channels.groupby('channel').agg({
    'spend': 'sum',
    'leads': 'sum',
    'MQLs': 'sum',
    'SQLs': 'sum',
    'CAC': 'mean',
    'ROI': 'mean',
    'opportunities': 'sum',
    'closed_won': 'sum'
}).round(2).reset_index()

# Process Pipeline data
pipeline_metrics = {
    'totalPipeline': float(pipeline_deals['amount'].sum()),
    'weightedPipeline': float(pipeline_deals['expected_value'].sum()),
    'avgDealSize': float(pipeline_deals['amount'].mean()),
    'totalDeals': int(len(pipeline_deals)),
    'avgProbability': float(pipeline_deals['probability'].mean())
}

# Calculate win rate
closed_deals = pipeline_deals[pipeline_deals['stage'].isin(['Closed_Won', 'Closed_Lost'])]
win_rate = len(closed_deals[closed_deals['stage'] == 'Closed_Won']) / len(closed_deals) if len(closed_deals) > 0 else 0
pipeline_metrics['winRate'] = float(win_rate * 100)

# Pipeline by stage (flattened)
stage_summary = pipeline_deals.groupby('stage').agg({
    'amount': ['sum', 'mean', 'count'],
    'probability': 'mean',
    'expected_value': 'sum'
}).round(2)

# Flatten the multi-level columns
stage_data = []
for stage in stage_summary.index:
    stage_data.append({
        'stage': stage,
        'totalAmount': float(stage_summary.loc[stage, ('amount', 'sum')]),
        'avgAmount': float(stage_summary.loc[stage, ('amount', 'mean')]),
        'dealCount': int(stage_summary.loc[stage, ('amount', 'count')]),
        'avgProbability': float(stage_summary.loc[stage, ('probability', 'mean')]),
        'expectedValue': float(stage_summary.loc[stage, ('expected_value', 'sum')])
    })

# Process Revenue data
revenue_metrics = {
    'totalMRR': float(revenue_customers['mrr'].sum()),
    'totalARR': float(revenue_customers['mrr'].sum() * 12),
    'avgARPA': float(revenue_customers['arpa'].mean()),
    'avgNRR': float(revenue_customers['nrr'].mean()),
    'totalCustomers': int(len(revenue_customers)),
    'churnedCustomers': int(revenue_customers['churned_flag'].sum()),
    'churnRate': float((revenue_customers['churned_flag'].sum() / len(revenue_customers)) * 100)
}

# MRR breakdown by segment (flattened)
segment_data = []
for segment in revenue_customers['segment'].unique():
    segment_customers = revenue_customers[revenue_customers['segment'] == segment]
    segment_data.append({
        'segment': segment,
        'totalMRR': float(segment_customers['mrr'].sum()),
        'newMRR': float(segment_customers['new_mrr'].sum()),
        'expansionMRR': float(segment_customers['expansion_mrr'].sum()),
        'contractionMRR': float(segment_customers['contraction_mrr'].sum()),
        'avgARPA': float(segment_customers['arpa'].mean()),
        'avgNRR': float(segment_customers['nrr'].mean()),
        'customerCount': int(len(segment_customers))
    })

# Create time series data for trends (using sample data)
dates = pd.date_range(start='2024-01-01', end='2024-12-31', freq='M')
trend_data = []
for i, date in enumerate(dates):
    trend_data.append({
        'date': date.strftime('%Y-%m-%d'),
        'leads': int(marketing_metrics['totalLeads'] / 12 * (1 + np.sin(i * 0.5) * 0.2)),
        'MQLs': int(marketing_metrics['totalMQLs'] / 12 * (1 + np.sin(i * 0.5) * 0.15)),
        'SQLs': int(marketing_metrics['totalSQLs'] / 12 * (1 + np.sin(i * 0.5) * 0.1)),
        'mrr': float(revenue_metrics['totalMRR'] / 12 * (1 + i * 0.02))
    })

# Stuck deals analysis
stuck_deals = pipeline_deals[
    (pipeline_deals['days_in_stage'] > 45) & 
    (pipeline_deals['stage'].isin(['Discovery', 'Demo', 'Negotiation']))
].copy()

stuck_deals_summary = []
for _, deal in stuck_deals.head(10).iterrows():  # Top 10 stuck deals
    stuck_deals_summary.append({
        'dealId': deal['deal_id'],
        'account': deal['account'],
        'amount': float(deal['amount']),
        'stage': deal['stage'],
        'daysInStage': int(deal['days_in_stage']),
        'owner': deal['owner'],
        'probability': float(deal['probability'])
    })

# Combine all data
dashboard_data = {
    'marketing': {
        'metrics': marketing_metrics,
        'channelPerformance': channel_performance.to_dict('records'),
        'funnelData': [
            {'stage': 'Leads', 'count': marketing_metrics['totalLeads']},
            {'stage': 'MQLs', 'count': marketing_metrics['totalMQLs']},
            {'stage': 'SQLs', 'count': marketing_metrics['totalSQLs']},
            {'stage': 'Opportunities', 'count': marketing_metrics['totalOpportunities']},
            {'stage': 'Closed Won', 'count': marketing_metrics['totalClosedWon']}
        ],
        'trendsData': trend_data[:6]  # Last 6 months
    },
    'pipeline': {
        'metrics': pipeline_metrics,
        'stageBreakdown': stage_data,
        'dealsBySegment': pipeline_deals.groupby('segment')['amount'].sum().to_dict(),
        'stuckDeals': stuck_deals_summary
    },
    'revenue': {
        'metrics': revenue_metrics,
        'segmentBreakdown': segment_data,
        'mrrComponents': {
            'new_mrr': float(revenue_customers['new_mrr'].sum()),
            'expansion_mrr': float(revenue_customers['expansion_mrr'].sum()),
            'contraction_mrr': float(revenue_customers['contraction_mrr'].sum())
        },
        'trendsData': [
            {'month': item['date'], 'mrr': item['mrr']} 
            for item in trend_data[-6:]  # Last 6 months
        ]
    },
    'benchmarks': benchmarks.to_dict('records')
}

# Save the properly formatted data
with open('dashboard_data.json', 'w') as f:
    json.dump(dashboard_data, f, indent=2)

print("✅ Dashboard data successfully processed!")
print("\n📊 Key Metrics Summary:")
print(f"💰 Total MRR: ${revenue_metrics['totalMRR']:,.2f}")
print(f"📈 Total ARR: ${revenue_metrics['totalARR']:,.2f}")
print(f"🎯 Marketing Spend: ${marketing_metrics['totalSpend']:,.2f}")
print(f"🏆 Average ROI: {marketing_metrics['avgROI']:.1f}%")
print(f"💼 Total Pipeline: ${pipeline_metrics['totalPipeline']:,.2f}")
print(f"🎲 Win Rate: {pipeline_metrics['winRate']:.1f}%")
print(f"👥 Total Customers: {revenue_metrics['totalCustomers']:,}")
print(f"⚠️  Stuck Deals: {len(stuck_deals)}")

print(f"\n🏢 Revenue by Segment:")
for segment in segment_data:
    print(f"  {segment['segment']}: ${segment['totalMRR']:,.2f} MRR ({segment['customerCount']} customers)")

print(f"\n📢 Top Marketing Channels:")
top_channels = sorted(channel_performance.to_dict('records'), key=lambda x: x['ROI'], reverse=True)[:3]
for channel in top_channels:
    print(f"  {channel['channel']}: {channel['ROI']:.1f}% ROI (${channel['spend']:,.0f} spend)")

print("\n🚀 Data ready for dashboard app creation!")