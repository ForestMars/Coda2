## CSSE module


import os
import re
import sys
#sys.path.append(os.getcwd()) # Set this in ENV to avoid this.
#from lib.modules import *
import pandas as pd

# date = '2020-04-22'
# '%s' % '-'.join(re.findall(r'\d+', "2013-12-20 23:40:33")[::-1])
# date_reversed = '%s' % '-'.join(re.findall(r'\d+', date)[::-1]) # This is ~5x as fast as using datetime.

year = '2020'
month = '04'
day = '22'
date = month +'-'+ day +'-'+ year

# bastards are using mixendian dates.
csse_url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/'
csse_daily = 'csse_covid_19_daily_reports/'

data_url = csse_url + csse_daily + date
df = pd.read_csv(data_url + '.csv')
