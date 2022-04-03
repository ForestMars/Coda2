# data.py - App module for Codato data table browser.
__version__ = '0.1'
__all__ = ['layout', 'dash_table.DataTable', '_generate_table', 'csv_strong', 'dataset_files', 'dataset_names', 'datasets']

import dash
import dash_table
import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output
import plotly.graph_objs as go
import pandas as pd

from etl.etl import * # @TODO
from common.utils import * # @FIXME
from common.better_title import better_title
from lib.components import region_dropdown, region_dropdown_, USGlobal_
#from data_loader import DATASET, DATA_DIR, states
from data_loader import DATASET, DATA_DIR
from Datasets.__meta__.nations import big_countries
import assets.footer as footer

df = pd.read_csv(DATASET)
df_ = pd.read_csv(DATA_DIR + 'Global/ecdc_covid_data.csv')

regions='countriesAndTerritories'
all_countries = list(df_.countriesAndTerritories.unique())

# Unlike pure React, nested components are structures, not functions. This is somewhat complicated by Dash's callback stacking.
region_dropdown_wb = region_dropdown_('World', 'China')



layout = html.Div([
    html.Div([ # top / bottom
        html.Div([ # selector-cols
            html.H4(["Covid Global Spread"],
                style = {'float':'left', 'clear':'right', 'padding-left':0, 'padding-top':'1vw', 'margin-left':0, 'margin-bottom':0, 'letter-spacing':'.04em', 'word-spacing':'.04em', 'font-smoothing':'always', 'width':'75%', 'backgroundColor': '#'},
                ),

            html.Div([ # radio-selectors-div
                dcc.RadioItems(
                    id="USGlobal",
                    options=[
                        {'label': ' Global Case Data', 'value': 'World'},
                        {'label': ' USA Case Data', 'value': 'USA'},
                        {'label': ' New York Case Data', 'value': 'NYC'}
                        ],
                    value='World',
                    labelStyle={'display': 'block'}
                    ),
                html.Hr(),
                dcc.RadioItems(
                    id="confirmed",
                    options=[
                        {'label': ' Confirmed Cases', 'value': 'cases'},
                        {'label': ' Deaths', 'value': 'daths'}
                        ],
                    value='cases',
                    labelStyle={'display': 'block'}
                    ),
                ],
            id='radio-selectors-div',
            style={'float':'right', 'clear':'none', 'margin':'0 0 0 0', 'font-size':'.66em', 'padding':'10px', 'margin-right':'3.33vw', 'vertical-align':'text-top', 'backgroundColor':"#", }
            ), # close radios div
        region_dropdown_wb,
        ], # end selector-cols items
        id="selector-cols", # This pads title div (but not region dropdown.)
        style={'maring-top':0, 'padding-top':0, 'padding-left':'1vw', 'vertical-align':'text-top', 'backgroundColor': '#' },
        ), # close selector cols div



    html.Div([
        dcc.Graph(
            id='table_dada_big',
            config={'displayModeBar': False},
            style={'text-align': 'center','margin-left':0, 'margin-top':0, 'width':'96vw', 'float':'left', 'display':'table', 'padding-right':'3vw', 'padding-left':'1vw'},
            ),
        ],
        style={'backgroundColor':"green", 'padding-left':0},
        id='graph-wrapper',
    ),

    ], # top / bottom items
    id='drycontent',
    style={'padding':0, 'margin-top':0, 'backgroundColor':"#fcfefb", 'overflow':'auto'},
    ), # close top / bottom
    html.Hr(style={'padding-top':'3vw', 'margin-top':'3vw', 'padding-bottom':0, 'margin-bottom':0}),
    footer.get_footer()
]) #


def callback(app):

    @app.callback(
        Output('region_dropdown', 'options'),
        [Input('USGlobal', 'value')])
    def update_region_selector_dropdown(area):
        region_dropdown_(area)
        #df_1 = pd.read_csv(DATA_DIR + 'Global' + 'ecdc_covid_data.csv')
        #feature_options = {col:col for col in df_1.columns}
        if area == 'World': # If statements are the bane of functional programming.
            return [{'label': i, 'value': i} for i in big_countries]
        elif area == 'USA': # If statements are the bane of functional programming.
            return [{'label': i, 'value': i} for i in states]
        elif area == 'NY': # If statements are the bane of functional programming.
            return [{'New York State': 'NYS', 'New York City': 'NYC', 'Long Island': 'LI'}]


    @app.callback(
        Output('table_dada_big', 'figure'),
        [Input('USGlobal', 'value'),
        Input('region_dropdown', 'value'),
        ])
    def update_figure(area, countries):
        fig=go.Figure()
        print('countries')
        print(countries)
        if type(countries) is str:
            countries = [countries]
        #regions='countriesAndTerritories'
        date='dateRep'
        confirmed='cases'

        dateparse = lambda x: pd.datetime.strptime(x, '%d/%m/%Y')
        df = pd.read_csv(DATA_DIR + 'Global/ecdc_covid_data.csv', parse_dates=['dateRep'], date_parser=dateparse)
        df = df[df[regions].isin(countries)]
        df['moving'] = df.groupby(regions)[confirmed].transform(lambda x: x.rolling(7, 1).mean())
        df = df.replace(0, '')

        fig=go.Figure()

        fig={
            'data': [
                go.Scatter(mode='lines',
                #x = df1['dateRep'],  y = df1['cases'],
                x=df[df[regions] == i][date],
                #y=df[df[regions] == i][confirmed],
                y=df[df[regions] == i]['moving'],
                text=df[df[regions] == i][regions],
                #hover_data=[]
                #yaxis = 'y',
                opacity=0.8,
                hovertext = i,
                connectgaps = True,
                #hovertemplate = None,
                name = i ) for i in getattr(df, regions).unique()

                ],
            'layout': go.Layout(
                transition = {'duration': 500},
                hovermode='closest',
                #xaxis={'type': 'log'},
                #xaxis={'title': 'Date'},
                xaxis=dict(
                    title='Count',
                    dtick=0),
                yaxis=dict(
                    title='Cases',
                    tickfont=dict(
                        size=10),
                    dtick=1,
                    type='log'),
                legend={'traceorder':'normal'},
                plot_bgcolor='#fdfefd',
                paper_bgcolor='#fcfefb'
                #legend={'x': 0, 'y': 1},
                #margin={'l': 40, 'b': 40, 't': 10, 'r': 10},
                )
            }


        return fig


        fig.update_layout(
            title={'text': '{} x {} by country'.format('Cases', 'Date'),
            'xanchor':"center",
            },
            width=1500,
            height=900,
            xaxis_type="log",
            xaxis_tickformat=",d",
            plot_bgcolor='#efefff',
            paper_bgcolor='#eef'
            )



if __name__ == '__main__':
    app.run_server(debug=True)
