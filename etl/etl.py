# etl.py - module to clean up incoming covid 19 datasets for ingenstion
__version__ = '0.1'
__all__ = ['FetchData', 'GetCTPData', 'ProcessCTPData', 'FormatDates']

""" @TODO - should have own getargs.py """

import csv
import os
import datetime

import pandas as pd

from common import utils
from Datasets.__meta__.state_abbrs import state_abbrs


US_DAILY = 'https://covidtracking.com/api/v1/us/daily'
US_STATES_DAILY = 'https://covidtracking.com/api/v1/states/daily'

home = os.environ['EST_HOME']

cols = ['date', 'state', 'positive', 'hospitalized', 'death', 'positiveIncrease']
col_name_map = {
    'positive': 'confirmed',
    'death': 'death',
    'state': 'state'
}


class FetchData():
    """ Retrieve (csv) Dataset from a known source """

    def __init__(self):
        pass

    def get_csv_data(self, csv_url: str):
        if csv_url[-4:] == '.csv':
            return pd.read_csv(csv_url)
        else:
            raise ValueError('Target URL does not appear to be a csv.')


class ProcessData():
    """ Retrieve (csv) Dataset from a known source """

    def __init__(self, dir):
        self.data_dir = os.environ['EST_HOME'] + '/' + dir


    def parse_data_by_region(self, df):
        """ Split CTP by state and cast to int. No idea why they have it as floats. """

        df = df.fillna(0) # (Not needed with na=False)
        # We should always check that dir has a trailing /
        countries = list(df.country_region_code.unique())

        for country in countries:
            if type(country) == str:
                df_ = df[df['country_region_code'].str.contains(country, na=False)]
                os.chdir(data_dir)
                if os.path.isdir(country):
                    write_f(country, country + '.csv', df_.to_csv(index=False))
                else:
                    os.mkdir(country)
                    write_f(country + '/', country, df_.to_csv(index=False))

    def parse_us_data_by_state(self, df):
        df_us = df[df['country_region_code'].str.contains('US', na=False)]
        state_names = list(df_us.sub_region_1.unique())
        for state in state_names:
            #if type(state) is str and state != '' and state is not None:
            if type(state) is str:
                state_abbr = state_abbrs.get(state)
                df_state = df_us[df_us['sub_region_1'].str.contains(state, na=False)]
                df_state = self.avg_social_distance_scores(df_state)
                if os.path.exists(state_abbr + '.csv'):
                    os.system('cp ' + state_abbr + '.' + state_abbr)
                write_f(self.data_dir + 'US-mobile/', state_abbr, df_state.to_csv(index=False))
                #        pass
            #os.system('cp -r country '.'+country)
            #if os.path.isdir(country):
            #    write_f(dir, state, df_.to_csv(index=False))
            #    if country_region_code != '' and os.path.isdir(country_region_code):
                    #write_f(dir, state, df_.to_csv(index=False))

    def avg_social_distance_scores(self, df):
        df['social_distance_avg'] = df[[
            'retail_and_recreation_percent_change_from_baseline',
            'grocery_and_pharmacy_percent_change_from_baseline',
            'parks_percent_change_from_baseline',
            'transit_stations_percent_change_from_baseline',
            'workplaces_percent_change_from_baseline',
            ]].mean(axis=1)
        return df


class GetCTPData():
#    """ Retrieve Covid Tracking Poject Data """

    def __init__(self):
        self.us_daily = US_DAILY
        self.us_states_daily = US_STATES_DAILY
        self.us_daily = 'https://covidtracking.com/api/v1/us/daily'
        # self.us_states_daily = 'https://covidtracking.com/api/v1/states/daily'  # .csv deprecated, covid data now in json format only.
        #self.us_states_daily = 'https://api.covidtracking.com/v1/states/current.json'
        self.us_states_daily = 'https://api.covidtracking.com/v1/states/daily.csv'

    def _get_ctp_data(self, ctp_url: str) -> pd.DataFrame:
        #data = pd.read_csv(ctp_url + '.csv')  # deprecated format
        data = pd.read_csv(ctp_url)

        return data

    def get_state_historic(self) -> pd.DataFrame:

        return self._get_ctp_data(self.us_states_daily)

    def get_us_historic(self) ->pd.DataFrame:

        return self._get_ctp_data(self.us_daily)


class ProcessCTPData():
#    """ Process Covid Tracking Poject Data """

    def __init__(self):
        pass # No constructor

    def keep_cols(self, df):

        cols_drop = [col for col in df.columns if col not in cols]

        for col in cols_drop:
            df.drop(col, axis=1, inplace=True)

        return df

    def parse_state_daily_data(self, df):
        """ Split CTP by state and cast floats to int. """

        dir = os.environ['EST_HOME'] + '/Datasets/USA/'
        states = list(df.state.unique())
        df = df.fillna(0)

        for state in states:
            df_ = df[df['state'].str.contains(state)]
            cols = list(df.columns)
            #cols.remove('date')
            cols.remove('state')
            df[cols] = df[cols].astype(int)

            try:
                write_f(dir, state, df_.to_csv(index=False))
                print('wrote', state)
            except Exception as e:
                print(e)



class FormatDates():
    """ Useful date formatting functions """

    def __init(self):
        """ Constructor takes path to datafile as arg """
        #df = get_df(data)

    def get_df(dataset):
        """ Takes a *formatted* dataframe with dates in column 0.  """
        df = csv_to_df(dataset) # Loads dataframe for a given location.
        df.rename(columns = {df.columns[0]:'date'}, inplace = True)
        df.columns = map(str.lower, df.columns) # This is gneral formatting, not date formatting.
        return df

    def cast_to_file(datafile, cast_from, cast_to):
        """ Recasts a csv with a date column. """
        df = df_cast(df)
        write_f(df.to_csv(datafile, index=false))

    def df_cast(self, cast_from, cast_to):
        """ date column format dispatch """
        #cast = 'cast_from' + cast_from + 'to' + cast_to
        cast = 'df' + cast_from + 'to' + cast_to
        df_cast = getattr(self, cast, lambda: "Not Found")
        return df_cast

    """ Given a dataframe with a date column of type int, casts column to date object type """
    def df_int_to_date(self, df):
        for column in df.columns:
            if column == 'date':
                pass
                df['date'] = df['date'].apply(lambda x: pd.to_datetime(str(x), format='%d/%m/%Y'))
        return df

    def df_date_to_int(df):
        for col in df.columns:
            if col.lower() == 'date':
                #df.date.str.strip('-') # Doesn't work.
                df.date = df.date.str.replace('-', '', regex=True)
                df[col] = df[col].astype(int)
        return df

    def df_str_to_str(self, df) -> None:
        """ Fix date formatting in a csv """
        df['date'] = pd.to_datetime(df['date'])
        df.date.apply(lambda x: x.strftime('%Y-%m-%d')).astype(str)
        return df.to_csv(index=False)

    def df_format_dates(df, col='Date'):
        """ Fix date formatting in a dataframe """
        df[col] = pd.to_datetime(df[col])
        df.dateRep.apply(lambda x: x.strftime('%Y-%m-%d')).astype(str)
        return df

""" additional cast functions in utils """
def df_floats_to_int(df):
	for col in df.columns:
		if col != 'date':
			df.col = df.col.astype(int)

def df_cast_col(df, col, cast):
	""" This *should* check the from type before casting. """
	for column in df.columns:
		if column == col: # This is why I <3 Python.
			df.column = df.col.astype(cast)

def df_dt_to_ord(df):
	""" Given a dataframe with a Date column as the first column, converts to ordinal """
	import datetime as dt
	#df['Date_ord'] = pd.to_datetime(df['Date']) # fix this to catch 'date' and 'Dates'
	df['Date_ord'] = pd.to_datetime(df.iloc[:,0]) # fix this to catch 'date' and 'Dates'
	df['Date_ord'] = df['Date_ord'].map(dt.datetime.toordinal)
	return df

def dt_to_ordinal():
    import datetime as dt
    data_df['Date'] = pd.to_datetime(data_df['Date'])
    data_df['Date']=data_df['Date'].map(dt.datetime.toordinal)

def nyc_date_clean():
	""" Don't use. """
	data = get_city_data('NYC')
	df = get_df(data)
	df = df_date_to_int(df)
	write_f('Datasets/NY/NYC/', 'cases', df.to_csv(index=False))


## File handling
def write_f(dir, filename, new_csv):
    """ used here """
    file = dir + filename + '.csv'
    f = open(file, 'w')
    f.write(new_csv)
    f.close()

def write_file(file, csv):
    """ used in parse state module """
    f = open(file, 'w')
    f.write(csv)
    f.close()

def write_file_old(dir, filename, new_csv):
    """ not used but should be (context manager)"""
    file = open(filename, 'w')
    with file:
        writer = csv.writer(file)
        writer.writerows(new_csv)


## Placeholders
def date_col():
    # find date column
    # insure date column is at column index 0
    pass

def cases_col():
    #find cases column
    #rename to "cases"
    pass

def hospitalized_col():
    #find hostpiralized column
    #rename to "hospitalized"
    pass

def deaths_col():
    #find deaths column
    #rename to "deaths"
    pass
