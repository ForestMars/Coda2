import os

import pandas

from etl import etl
from etl.etl import GetCTPData


if __name__ == '__main__':

    get_ctp_data = etl.GetCTPData()
    process_ctp_data = etl.ProcessCTPData()

    ctp_data = get_ctp_data.get_state_historic()

    home = os.environ['EST_HOME']
    os.chdir(home + '/Datasets')
    os.system('cp -r USA .USA')

    ctp_data = process_ctp_data.keep_cols(ctp_data)
    input(ctp_data)
    process_ctp_data.parse_state_daily_data(ctp_data)
