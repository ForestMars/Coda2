#!/usr/bin/python3
# predict.py - module for predicting incidence
breakpoint()
__version__ = '0.2'
__all__ = ['get_layout'] # Some apps export layout as var and some expose as functon. Does it makes sense to support both?  @Question

import os
import collections
from datetime import datetime
from pathlib import Path

# get_args imported if main.
from lib.modules import * # @TODO
from common.utils import *
from lib.fit import *
from lib.predict_data import *
import data_loader

from app import app
from assets import menu
from assets import footer
import dashit
#from style import * # speechless.


traces = {}
options = [] # labels needed by app.layout
region = 'NY' # Set initial region to display.

# Not used (yet)
GEOGRAPHIC = 'US' # options are NY, US, Global
LATEST = '5/10/2020'

# This should b a tuple, if it's even needed at all.
"""
features = {
    #"cases": 1,
    "positive": 5,
    "hospitalized": 2,
    "death": 3,

}
"""


## Get Data. (this is redundant, remove here or from predict_data.py)
# @FIXME: TMP WORKAROUND
breakpoint()
#for v, k in data_loader.states.items():
#    options.append(dict([('label', k), ('value', v)]))

df = get_df(dataset)
days = len(df.index) # Display entire date range by default?
x, y = get_xy(df) # Likely legacy function.


def get_date_marks(df):
    dates = df.iloc[:,0] # Assumes Date is our first column
    date_marks = {}
    d = {}
    #date_marks = [x for x in range(len(df['date'].unique()))]
    _marks = [x for x in range(len(df['date'].unique()))]
    for x in _marks:
        d = {'label': str(x)}
        date_marks.update({x:d})
    return len(df.index), dates, date_marks
period, dates, date_marks = get_date_marks(df)


## Layout -- @TODO: Cleanup, move to layout.py + external css

dropdown = dcc.Dropdown(
    id = 'region_dropdown',
    options = options,
    value='NY',
    multi=True

)
rangeslider = dcc.RangeSlider(
    id = 'slider',
    marks = date_marks,
    min = 0,
    max = period,
    value = [1, 55])

# Not used.
sliderstyle = {'width' : '80%',
        'fontSize' : '20px',
        'padding-top' : '1px',
        'padding-left' : '100px',
        'display': 'inline-block'},

def get_layout():
    # title = 'Time Series Plot', hovermode = 'closest'
    app.layout = html.Div([
        html.Div(
            [html.Div([
                html.H4("COVID Spread Predictor"),
                dcc.Markdown('''Generate a prediction matrix using a [model](model) over selected [features](features). Select regions to display and use sliders to set date range: and period to train on. Vertical slider on left controls zoom level.'''),
                dropdown,
                html.P("Data current up to " + LATEST),
                ],
                id='spread',

            ),
            #html.P("Use slider to select date range"),
            #html.P([
                #html.Label("Regions to display:"),
                #dropdown,
            #]),
        ],
        style = {'padding-left': '25px', 'padding-right': '25px', 'padding-top':'15px', 'backgroundColor': '#'},
        ),
        html.Div(
            [
            html.Div(
                [
                html.P([ html.Label(''),
                    dcc.RangeSlider(id = 'y_slider',
                                vertical = True,
                                min = 0,
                                max = 300000,
                                value = [1, 300000]),
                    ],
                    style = {'backgroundColor' : '', 'width' : 'auto', 'height' : '400px', 'float' : 'left','margin-left':'10px', 'margin-right':0,'padding-right':0,'padding-left':'10px'},
                    ),
                ],
                style = {'backgroundColor' : '','height' : 'auto', 'float' : 'left','margin-left':0, 'margin-right':0,'padding-right':0,'padding-left':0},
                ),
            html.Div(
                [
                dcc.Graph(id = 'plot', config={'displayModeBar': False} ),],
                style = {'backgroundColor':'','width':'95vw','height':'auto','margin-top':'6px','padding-top':0,'margin-left':0,'padding-left':0,'float':'left'},
                ),
            html.Div(
                [
                html.P([ html.Label("")],
                style = {'backgroundColor' : '#', 'width' : 'auto', 'height' : '100%', 'float':'left','padding':0,'margin':0,'margin-right':0},
                ),
                ],
                style = {'backgroundColor' : '#', 'width' : 'auto', 'height' : '100%', 'float':'left','padding':0,'margin':0,'margin-right':0},
                ),
            ],
            style = {'backgroundColor' : '', 'width':'100vw','margin-right':0},
        ),

        html.P(
            [
                html.Label("Time Range to display (days since patient zero)"),
                rangeslider,

                html.Div(
                    [
                    html.Label("Training Period (days since patient zero)"),
                    dcc.RangeSlider(id = 'train_slider',
                                marks = date_marks,
                                min = 0,
                                max = period,
                                value = [1, 55]),
                    ],
                    style = {'margin-top' : '12px'}),

                ],
                style = {'width' : '80%',
                        'fontSize' : '20px',
                        'padding-top' : '23px',
                        'padding-left' : '100px',
                        'display': 'inline-block'},
            ),
        footer.get_footer()
        ],
        style={},
        )
    return app.layout

layout = get_layout()

def callback(app):
    @app.callback(
        Output('plot', 'figure'),
        [Input('slider', 'value'),
        Input('region_dropdown', 'value'),
        Input('train_slider', 'value'),
        Input('y_slider', 'value'),
        ])
    def update_figurez(D, region, train_slider, y_slider):
        # Unfortunately, dcc sends a differently typed object if the list only has 1 item. :-(
        # Fortunately, this is a great example of why Duck Typing rocks.
        if type(region) == str:
            region = [region]
        regions = region # fix

        # Given a selected region, fetch the data into a df. @TODO: request specific traces.
        trace_regions = {}
        distance_data = {}
        CDH = ['positive', 'death', 'hospitalized'] # @FIXME: Kill this.
        for region in regions: # 1st region already popped
            trace_regions[region] = CDH
            #distance_data[region] = get_social_distance_data(region)

        fig = go.Figure()
        df = get_multi_df(regions)

        train_days = train_slider[1] # for now upper bound not both.

        date_display = df[(df['date'] > dates[D[0]]) & (df['date']< dates[D[1]])]

        merged_inner = pd.merge(left=df, right=date_display, left_on='date', right_on='date')

        #pt_key = df.columns.get_loc(trace_regions['NY'][0])
        #fig = dashit.dash_trace(date_display['date'], date_display.iloc[:,pt_key])

        # Given the multi-region df with labeled features, fetches a fit for each feature.

        traces = get_traces_rf(df, train_days, trace_regions)

        dashit.reset_colors() # Kill this.
        for trace, trace_df in traces.items():
            # add traces for actual
            fig = dashit.add_trace_dots(fig, trace, trace_df['date'], trace_df[trace])
            # add traces for projectons
            fig = dashit.add_trace_line(fig, trace, trace_df['date'], trace_df['fit'])

        """print(distance_data)
        for reg in distance_data:
            fig = dashit.add_distancing_data(fig, 'distance_data', distance_data[region]['date'], distance_data[region]['social_dstance_avg'])
        """
        fig.update_layout(xaxis_tickformat = '%d %B',
            plot_bgcolor='#fcfefb')

        xlim = [0, 9]
        ylim = [0, 200000]
        ylim = [y_slider[0], y_slider[1]]
            #fig['layout'].update(height = 1000, width = 6000, title = "foofoo", yaxis = dict(range = ylim))
        fig['layout'].update(yaxis = dict(range = ylim), width = 1200,)

        return fig


if __name__ == '__main__':
    from get_args import get_args
    app.run_server(
        debug=True
    )
