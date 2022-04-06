#!/usr/bin/python3
# data_loader.py - Handles data loading for Coda.to apps.
# breakpoint()
__version__ = '0.2'
__all__ = ['WorldData', 'StateData', 'DATA_DIR', 'DATASET', 'DATA_FILE']

import os

import pandas as pd

import common.utils as utils
from common.better_title import better_title
#from Datasets.__meta__.state_names import states
#from Datasets.__meta__.state_names import states as USA
from Datasets.__meta__.nations import big_countries

# @TODO: This is all dynamically loaded
DATA_AREA = 'Global/' # legacy
DATA_DIR = 'Datasets/'
# DATA_DIR = 'Datasets/Global'  # lib.components
DATA_FILE = 'global_demographic_data.csv' # legacy
DATASET = DATA_DIR + DATA_AREA + DATA_FILE # legacy
# DATASET = DATA_DIR + '/' + DATA_FILE                                                        # lib.components

#DATA_FILE2 = 'ecdc_covid_data.csv'
DATA_FILE2 = 'owid_covid_data_by_country_2020.csv'
DATASET2 = DATA_DIR + DATA_AREA + DATA_FILE2 # legacy

# This is naked and needs to find a home (we only load the module once.)
dataset_dirs = [ data_dir for data_dir in utils.get_sub_dirs(DATA_DIR) ]
dataset_files = [ dataset for dataset in utils.get_reg_files(DATA_DIR) ]
dataset_names = [ better_title(dataset.split('.')[0].replace('_',' ').title()) for dataset in utils.get_reg_files(DATA_DIR) ]

datasets = dict(zip(dataset_files, dataset_names))

data_dir = {
    'world': 'Datasets/Global', # This should be 'World'
    'usa': DATA_DIR + 'USA/',
    'states': 'Datasets/USA/', # legacy
    'newyork': DATA_DIR + 'NY/' # Better.
}

World = dict(zip(big_countries, big_countries))


# Some of this is pure data handling and some touches file system.
class StateData(object):

    def __init__(self):
        breakpoint()
        self.states = [f for f in os.listdir(data_dir['states']) if os.path.isfile(os.path.abspath(os.path.join(DATA_DIR, f))) and not f.startswith('.')]
        self.idx = 0

    def __iter__(self):
        yield from self.states

    def __next__(self):
        self.idx += 1
        try:
            return self.states[self.idx-1]
        except IndexError:
            self.idx = 0
            raise StopIteration

    def get_name(self, state_abbr):
        return states.get(state_abbr)
        pass

    def get_states(self):
        return states


class AreaData(object):
    pass


def get_region_data(area: str, region: str) -> str:
    "Given an area and a region, returns string containing filepath to csv"
    dataset = data_dir[area]+ region + '.csv'
    return dataset

if __name__ == '__main__':
    df = pd.read_csv(DATASET)
    print(df.head())
    print(df.deaths.unique())
    print(df.recovered.unique())
    print(df.current_cases.unique())
