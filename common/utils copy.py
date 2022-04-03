# utils.py - Mother's Little Helpers. Dedicated to LeLe & YingYing
__version__ = '0.1'
# __all__ = ['too-many-to-list-here-maybe-later']
#import logger

import os
import csv
import numpy as np
import pandas as pd
from matplotlib import pyplot


class DataFrameUtils(object):
    def __init__(self):
        pass

def date_slashes_to_dashes(df):
    """ converts dates from bigendian 31/12/2020 to littleendian 2020-12-31 """



# This needs to be iterable.
def get_reg_files(dir: str, ext: str=csv) -> list:
    """ Returns list of filenames for given directory, excuding hidden files. """
    files = [f for f in os.listdir(dir) if os.path.isfile(os.path.abspath(os.path.join(dir, f))) and not f.startswith('.')]
    return files

def get_menu_items(dir: str, ext: str=csv) -> list:
    """ Wrapper for get_reg_files() to return only module name. """
    #files = [f for f in os.listdir(dir) if os.path.isfile(os.path.abspath(os.path.join(dir, f))) and not f.startswith('.')]
    items = [ f.split('.')[::-1][1] for f in get_reg_files(dir) ]
    return items

def get_modules(dir: str, ext: str=csv) -> dict:
    """ Returns dictionary of module files, keyed by module name. """
    mods = dict(zip(get_menu_items(dir), get_reg_files(dir)))
    return mods

# Not used. I mean would you use a function that had a name like this?
def get_deprefixed(dir: str, ext: str=csv) -> list:
    """ Returns list of filenames stripped of ordering prefixes. """
    mods = [ i + '.py' for i in get_menu_items(dir)]
    return mods


def get_df(dataset):
    """ Given path to csv, returns dataframe. """
    df = csv_to_df(dataset) # Loads dataframe for a given location.
    #df.rename(columns = {df.columns[0]:'date'}, inplace = True)
    df.columns = map(str.lower, df.columns)
    return df

def rename_cols(df: pd.DataFrame, map: dict) -> pd.DataFrame:
    for k in map:
        if k in list(df.columns): # Don't get me started.
            old_name = df.columns.get_loc(k)
            df.rename(columns = {df.columns[old_name]:map[k]}, inplace = True)
    return df

# Legacy function. Use Dictionary instead (but functionally.)
def rename_cols_by_state(df: pd.DataFrame) -> pd.DataFrame:
    for col in df_.columns :
        if col not in ['date', 'state']: # Bc python doesn't suppost 1 line condition loops, like some other langauages.
            idx = df_.columns.get_loc(col)
            new_name = region + ': ' + col
            df_.rename(columns = {df_.columns[idx]: new_name}, inplace = True) # Don't rename here please.
    return df

def csv_to_df(csv: str) -> pd.DataFrame: # alt. -> PandasDataFrame
    """ Given a csv, returns a pandas dataframe """
    return pd.read_csv(csv, parse_dates=['date'], infer_datetime_format=True)

def df_to_csv(df: pd.DataFrame) -> str:
    """ Given a dataframe, returns non-indexed csv """
    return df.to_csv(index=false)

def drop_df_cols(df:  pd.DataFrame, cols: list) ->  pd.DataFrame:
    """ Given a dataframe and a list of columns, drops them and returns dataframe """
    return df.drop(columns, inplace=True, axis=1)

def keep_df_cols(df:  pd.DataFrame, keep_cols: list) ->  pd.DataFrame:
    """ Given a dataframe and a list of columns, keeps them and drops the rest """
    drop_cols = list(set(df.columns) - set(keep_cols))
    df.drop(drop_cols, inplace=True, axis=1)
    return(df)

def numpy_to_df(arr):
    return pd.DataFrame(data=arr.flatten())

def df_to_arr(df: pd.DataFrame):
    col_arr = []
    index = list(range(df.shape[1]))
    for i in index:
        column = df.iloc[ : , i ].tolist()
        col_arr.append(column)
    return col_arr

def df_to_np_arr(df: pd.DataFrame) -> np.ndarray:
    col_arr = np.array()
    index = list(range(df.shape[1]))
    for i in index:
        column = df.iloc[ : , i ].tolist()
        col_arr.append(column)
    return col_arr

def get_df_col_list(df: pd.DataFrame)-> list:
    """ Returns list of column names for a dataframe """
    return list(df.columns)

def get_df_col_index(df, col):
    index = list(range(df.shape[0]))
    column = df.iloc[ : , col ].tolist()
    col_arr = []
    col_arr.append(index)
    col_arr.append(column)
    return col_arr

def get_xy(df, col: int = 1) -> list:
    x = list(range(df.shape[0]))
    y = df.iloc[ : , col ].tolist()
    return x, y

def get_patient_zero_date_by_regions(region):
    """ Given a region, returns date of 1st confrmed case. """



"""
# This is in logging module.
def logger():
    return logging.getLogger().setLevel(logging.INFO)

def log(logmsg, e=None):
    if e:
        err = ' ('+str(e)+')'+' ERROR: ' + repr(e)
    else:
        err = ''
    logging.info(' ' + logmsg + err)
"""

def i(i='continue?'):
    input(i)

def it(o) -> str:
	input(type(o))
