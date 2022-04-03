import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output
import plotly.graph_objs as go

from assets import menu
from lib.components import single_region_dropdown

from app import app
import numpy as np

global n1
n1 = 1
import assets
colors = ['darkred', 'darkmagenta', 'darkolivegreen','darkorange','darkorchid']



layout = html.Div([
    html.H3('SARS-CoV-2 Epidemiological Simulation'),

    dcc.Interval(
        id='intt',
        interval=100, # More epochs should run faser (lower interval value)
        max_intervals=3 # Eppch
    ),
    dcc.Graph(
        id='life_sim',
    )
])


def callback(app):
    @app.callback(Output('life_sim', 'figure'),
        [Input('intt', 'n_intervals'),
        ])
    def update_graph_scatter(int, trig):
        print('hey man nice sim')


        N = 1000
        random_x = np.random.randn(N)
        random_y = np.random.randn(N)
        M = 700
        random_y2 = np.random.randn(M)

        #for i in range(20):
        fig={
            'data': [
                go.Scatter(
                    x = random_x,
                    y = random_y,
                    mode = 'markers',

                    marker=dict(color=colors[n1])
                ),
                go.Scatter(
                    x = random_x,
                    y = random_y2,
                    mode = 'markers',
                    marker=dict(color=colors[n1+1])
                ),

            ],
            'layout': go.Layout(
                hovermode = 'closest',
                #transition = {'duration': 500}
                )
        }


        return fig
