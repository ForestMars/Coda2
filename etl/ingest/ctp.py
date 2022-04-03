import os
import re
import sys
import json
import urllib.request
import pandas as pd

url_states_daily = 'https://covidtracking.com/api/states/daily'
# test_daily = urllib.request.urlopen(url_states_daily).read().decode()
# data_json = json.loads(test_daily)

ctp_url = 'https://covidtracking.com/api/v1/states/daily'

df = pd.read_csv(ctp_url + '.csv')
