# First, let's examine the structure of the provided CSV data files to understand the data we're working with
import pandas as pd
import numpy as np

# Load all the CSV files
try:
    revenue_customers = pd.read_csv('revenue_customers.csv')
    marketing_channels = pd.read_csv('marketing_channels.csv')
    pipeline_deals = pd.read_csv('pipeline_deals.csv')
    benchmarks = pd.read_csv('benchmarks.csv')
    
    print("=== DATA FILES LOADED SUCCESSFULLY ===\n")
    
    # Show basic info about each file
    print("REVENUE CUSTOMERS DATA:")
    print(f"Shape: {revenue_customers.shape}")
    print(f"Columns: {list(revenue_customers.columns)}")
    print(revenue_customers.head(2))
    print("\n" + "="*50 + "\n")
    
    print("MARKETING CHANNELS DATA:")
    print(f"Shape: {marketing_channels.shape}")
    print(f"Columns: {list(marketing_channels.columns)}")
    print(marketing_channels.head(2))
    print("\n" + "="*50 + "\n")
    
    print("PIPELINE DEALS DATA:")
    print(f"Shape: {pipeline_deals.shape}")
    print(f"Columns: {list(pipeline_deals.columns)}")
    print(pipeline_deals.head(2))
    print("\n" + "="*50 + "\n")
    
    print("BENCHMARKS DATA:")
    print(f"Shape: {benchmarks.shape}")
    print(f"Columns: {list(benchmarks.columns)}")
    print(benchmarks.head())
    print("\n" + "="*50 + "\n")
    
except Exception as e:
    print(f"Error loading data: {e}")