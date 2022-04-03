import os

import pandas

from etl import etl


MOBILITY_REPORTS = 'https://www.gstatic.com/covid19/mobility/Global_Mobility_Report.csv'
DATA_DIR = 'Datasets/mobile_data/'


if __name__ == '__main__':

    get_data = etl.FetchData()
    csv_data = get_data.get_csv_data(MOBILITY_REPORTS)

    # parse dataset by state & save.
    process_csv_data = etl.ProcessData(DATA_DIR)
    #process_csv_data.parse_data_by_region(csv_data)
    process_csv_data.parse_us_data_by_state(csv_data)

    #ctp_data = process_ctp_data.keep_cols(ctp_data)

    #process_ctp_data.parse_state_daily_data(ctp_data)
