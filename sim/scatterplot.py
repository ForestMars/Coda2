import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output
import plotly.graph_objs as go

from apps import menu

from app import app
import numpy as np

M = 1000
N = np.random.randn(M)
random_x = np.random.randn(N)
random_y = np.random.randn(N)

layout = html.Div([
    
    menu.get_menu(),
    html.H3('Scatter Charrrrrt'),
    dcc.Interval(
        id='interval-component',
        interval=1*1000
    )
    dcc.Graph(
        id='life',

    )

])


def callback(app):
    @app.callback(Output('live, 'figure'),
                  [Input('int', 'interval')])
    def update_graph_scatter(int):
        print('hey mannice cb')
        #for i in range(20):
        fig={
            'data': [
                go.Scatter(
                    x = 2
                    y = random_y,
                    mode = 'line',

                )
            ],
            'layout': [
                hovermode = closest,
                transition = {'duration': 500} ],
        }


        return figasfsd
