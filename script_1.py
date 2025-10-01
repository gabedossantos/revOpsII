# Let's process and aggregate the data to create the key metrics needed for the dashboard
import json
from datetime import datetime, timedelta

# Process Marketing data
print("Processing Marketing Data for Dashboard...")
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

print("Marketing Metrics Summary:")
for key, value in marketing_metrics.items():
    print(f"{key}: {value}")

print(f"\nTop 5 Channels by Spend:")
print(channel_performance.sort_values('spend', ascending=False)[['channel', 'spend', 'ROI']].head())

# Process Pipeline data
print("\n" + "="*50 + "\n")
print("Processing Pipeline Data...")

# Pipeline metrics by stage
pipeline_by_stage = pipeline_deals.groupby('stage').agg({
    'amount': ['sum', 'mean', 'count'],
    'probability': 'mean',
    'expected_value': 'sum'
}).round(2)

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

print("Pipeline Metrics Summary:")
for key, value in pipeline_metrics.items():
    print(f"{key}: {value}")

print("\nPipeline by Stage:")
print(pipeline_by_stage)

# Process Revenue data
print("\n" + "="*50 + "\n")
print("Processing Revenue Data...")

revenue_metrics = {
    'totalMRR': float(revenue_customers['mrr'].sum()),
    'totalARR': float(revenue_customers['mrr'].sum() * 12),
    'avgARPA': float(revenue_customers['arpa'].mean()),
    'avgNRR': float(revenue_customers['nrr'].mean()),
    'totalCustomers': int(len(revenue_customers)),
    'churnedCustomers': int(revenue_customers['churned_flag'].sum())
}

# MRR breakdown by segment
mrr_by_segment = revenue_customers.groupby('segment').agg({
    'mrr': 'sum',
    'new_mrr': 'sum',
    'expansion_mrr': 'sum',
    'contraction_mrr': 'sum',
    'arpa': 'mean',
    'nrr': 'mean'
}).round(2)

# Calculate churn rate
revenue_metrics['churnRate'] = float((revenue_customers['churned_flag'].sum() / len(revenue_customers)) * 100)

print("Revenue Metrics Summary:")
for key, value in revenue_metrics.items():
    print(f"{key}: {value}")

print("\nMRR by Segment:")
print(mrr_by_segment)

# Combine all metrics for the dashboard
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
        ]
    },
    'pipeline': {
        'metrics': pipeline_metrics,
        'stageBreakdown': pipeline_by_stage.to_dict(),
        'dealsBySegment': pipeline_deals.groupby('segment')['amount'].sum().to_dict()
    },
    'revenue': {
        'metrics': revenue_metrics,
        'segmentBreakdown': mrr_by_segment.to_dict(),
        'mrrComponents': {
            'new_mrr': float(revenue_customers['new_mrr'].sum()),
            'expansion_mrr': float(revenue_customers['expansion_mrr'].sum()),
            'contraction_mrr': float(revenue_customers['contraction_mrr'].sum())
        }
    }
}

# Save processed data as JSON for the app
with open('dashboard_data.json', 'w') as f:
    json.dump(dashboard_data, f, indent=2, default=str)

print(f"\n✅ Dashboard data processed and saved to dashboard_data.json")
print(f"📊 Ready to create the RevOps Dashboard app!")