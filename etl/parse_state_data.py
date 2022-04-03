#parse_state.py - module to clean up data for a single state
breakpoint()
__version__ = '0.1'
__all__ = ['main', 'df_int_to_date']

import csv
import datetime
import pandas as pd

from etl import *
from lib import utils


DATA_DIR = 'Datasets/' + 'States/'
DATASET = 'WA'
FILENAME = 'WA'
DATA = DATA_DIR + DATASET + FILENAME
DEFAULT_STATE = 'WA'

def main():
    state = input("Which state to update?") or DEFAULT_STATE
    dataset = DATA_DIR + state + '.csv'
    df = get_df(dataset) # This is retrieved locally, not fetched.
    date_tools = FormatDates() # Hmmm, this means you have a copy of class for every datafile. What if there are 50+
    #df = date_tools.df_int_to_date(df) # Covid Tracking Project stores dates as int64.
    df = rename_cols(df, col_name_map) # Anytime we download a new set from Covid Tracking Project.
    df = df_int_to_date(df) # Covid Tracking Project stores dates as int64.
    write_file(dataset, df.to_csv(index=False, date_format='%Y-%m-%d'))

def df_int_to_date(df, col='date'):
    for column in df.columns:
        if column == col:
            df['date'] = df['date'].apply(lambda x: pd.to_datetime(str(x)))
            df['date'] = df['date'].apply(lambda x: pd.to_datetime(str(x), format='%Y-%m-%d'))
            #df['date'] = df['date'].apply(lambda x: pd.astype('datetime64[ns]'))
    return df



if __name__ == '__main__':
    main()
