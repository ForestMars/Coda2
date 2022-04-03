# data.py - app module for Codato data table page.
__version__ = '0.1'
__all__ = ['layout', 'dash_table.DataTable', '_generate_table', 'csv_strong', 'dataset_files', 'dataset_names', 'datasets']

import urllib.parse # Is this still used?

import dash
import dash_table
import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output
import pandas as pd

import common.utils as utils
from common.better_title import better_title


## Declarations & Data loading

DATA_DIR = 'Datasets/Global'
DATA_FILE = 'global_demographic_data.csv'
DATASET = DATA_DIR + '/' + DATA_FILE

#df = pd.read_csv(DATASET, parse_dates=['date'], infer_datetime_format=True)
df = pd.read_csv(DATASET)

dataset_files = [ dataset for dataset in utils.get_reg_files(DATA_DIR) ]
dataset_names = [ better_title(dataset.split('.')[0].replace('_',' ').title()) for dataset in utils.get_reg_files(DATA_DIR) ]
datasets = dict(zip(dataset_files, dataset_names))


## Definitions

def _generate_table(df):
    return dash_table.DataTable(
        #id='table',
        #columns=[{"name": i, "id": i} for i in df.columns],
        columns=[{"name": i, "id": i} for i in df.columns],
        data=df.to_dict('records'),
        editable=True, # This should only be true is edit param in get request is "True"
        style_as_list_view=True,
        sort_action='native'
        )

## Layout

layout = html.Div([

    html.Div([
        html.H4("Dataset Viewer"),
        #html.P("Use links on right to edit, save & download"),
        dcc.Dropdown(
            id='data-field-dropdown',
            options=[
                {'label': name, 'value': file} for file, name in datasets.items()],
            placeholder='Select a dataset to view...',
            value=DATA_FILE,
            ),
        html.Div([
            dcc.Link("Update   ", href="/api/fetch_current_data", title="Check for updates to this data set.", className="p-2 text-dark"),
            dcc.Link("Edit   ", href="/data?edit='True'", title="Edit", className="p-2 text-dark"),
            dcc.Link("Save   ", href="/data", className="p-2 text-dark"),
            html.A(
                'Download Data',
                id='download-link',
                download="rawdata.csv",
                href="",
                target="_blank"
                ),
            ],
            id='data-table-links',
            style={'text-align': 'right'}
            ),
        ],
        style = {'padding-left': '25px', 'padding-right': '15px', 'margin-left': '25px', 'margin-right': '15px'},
        ),
        html.Div(id='table'),
    ],
    style={'text-align': 'left'}
)


## Callback

def data_callback(app):

    @app.callback(
        dash.dependencies.Output('table', 'children'),
        [dash.dependencies.Input('data-field-dropdown', 'value')])
    def update_table(dataset):
        if dataset is not None:
            df = pd.read_csv(DATA_DIR + '/' + dataset)
            return _generate_table(df)

    @app.callback(
        dash.dependencies.Output('download-link', 'href'),
        [dash.dependencies.Input('download-link', 'download')])
    # Kind of an odd callback, since 'download' is not needed and not used.
    def update_download_link(filter_value):
        csv_string = df.to_csv(index=False, encoding='utf-8')
        csv_string = "data:text/csv;charset=utf-8," + urllib.parse.quote(csv_string)
        return csv_string



if __name__ == '__main__':
    app.run_server(debug=True)


## Here be dragons.



def merge_update():
    #df1 = pd.read_csv(DATA_DIR +
    #df1 =
    pass

def calculate_per_capita():
    """ returns confirmed cases as a % of total pop for a given time period. """
    pass
