# utils.py - Mostly preloading functions needed at the start of some particular module's load.
__version__ = '0.1.1'  # NB. Coda utils behind Innit utils.
__all__ = ['get_reg_files', 'get_menu_items', 'get_modules', 'get_deprefixed', 'date_slashes_to_dashes', 'get_xy']
#import logger

import os
import csv
import numpy as np
import pandas as pd
from matplotlib import pyplot


class ETL(object):
    def __init__(self):
        pass


def get_sub_dirs(dir: str, ext: str=csv) -> list:
    """ Decorator for all filesystem fetching operations. Returns list of entries for given directory, excuding hidden files. """
    dirs = [d for d in os.listdir(dir) if os.path.isdir(os.path.abspath(os.path.join(dir, d))) and not d.startswith('.')]
    dirs.remove('__pycache__')
    return dirs

# This needs to be iterable.
def get_reg_files(dir: str, ext: str=csv) -> list:
    """ Decorator for all filesystem fetching operations. Returns list of entries for given directory, excuding hidden files. """
    files = [f for f in os.listdir(dir) if os.path.isfile(os.path.abspath(os.path.join(dir, f))) and not f.startswith('.')]
    return files

def get_menu_items(dir: str, ext: str=csv) -> list:
    """ Wrapper for get_reg_files() to return only entry's name. """
    #files = [f for f in os.listdir(dir) if os.path.isfile(os.path.abspath(os.path.join(dir, f))) and not f.startswith('.')]
    items = [ f.split('.')[::-1][1] for f in get_reg_files(dir) ]
    return items

def get_modules(dir: str, ext: str=csv) -> dict:
    """ Returns dictionary of module filepaths, keyed by module name. """
    mods = dict(zip(get_menu_items(dir), get_reg_files(dir)))
    return mods

# Not used. I mean would you use a function that had a name like this? Having said that, prefixes must die.
def get_deprefixed(dir: str, ext: str=csv) -> list:
    """ Returns list of filenames stripped of ordering prefixes. """
    mods = [ i + '.py' for i in get_menu_items(dir)]
    return mods

def date_slashes_to_dashes(df):
    """ converts dates from bigendian 31/12/2020 to littleendian 2020-12-31 """


def get_df(dataset):
    """ Given path to csv, returns dataframe. """
    df = _csv_to_df(dataset) # Loads dataframe for a given location.
    #df.rename(columns = {df.columns[0]:'date'}, inplace = True)
    df.columns = map(str.lower, df.columns)
    return df

# U put the E in ETL.
def _csv_to_df(csv: str) -> pd.DataFrame: # alt. -> PandasDataFrame
    """ Given a csv, returns a pandas dataframe """
    return pd.read_csv(csv, parse_dates=['date'], infer_datetime_format=True)

def get_xy(df, col: int = 1) -> list:
    x = list(range(df.shape[0]))
    y = df.iloc[ : , col ].tolist()
    return x, y
