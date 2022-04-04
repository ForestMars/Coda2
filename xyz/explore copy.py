# x-by-y.py - dataviz module for quick X by Y charts.
__version__ = '0.1'
__all__ = ['layout', 'callback']
print("=========================LOADING ", __file__)
import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output
import plotly.graph_objs as go
import pandas as pd

# huh
from lib.components import x_axis_dropdown, y_axis_dropdown
from data_loader import DATASET, DATA_DIR

import assets.footer as footer

# why not DRY
df = pd.read_csv(DATASET)  # Datasets/Global/global_demographic_data.csvx

layout = html.Div([
    html.Div([ #

        html.Div(x_axis_dropdown,
                id="left-selectors",
                style={'width':'50%', 'float':'left', 'padding':'1vw', 'text-align':'center',
                'margin':'auto', 'backgroundColor': '#'},
                ),
        html.Div(y_axis_dropdown,
                id="right-se#lectors",
                style={'width':'50%', 'padding':'1vw', 'float':'left', 'text-align':"center"},
                ),
        ],
        id="selector-cols",
        style={'text-align':"center",
        },
        ),
    html.Div([
        dcc.Graph(id='table_',
            config={'displayModeBar': False},
            style={'text-align': 'center','margin-left':0, "width":"auto", 'float':'left', 'display':'table'},
            ),
        ],
        style={'backgroundColor':"#0f0", 'clear':"both"
        }),
    ],
    style={'backgroundColor':"#",
    },
)


def callback(app):

    @app.callback(
        Output( 'x-axis-feature-dropdown', 'options'),
        [Input('x-axis-dropdown', 'value')] )
    def update_X_dropdown(dataset):
        #df_1 = pd.read_csv(DATA_DIR + '/' + dataset)
        filepath = DATA_DIR + 'Global/' + dataset
        print('dataset 1 is')
        print(dataset)
        df_1 = pd.read_csv(filepath)
        #input(df_1.head())
        feature_options = {col:col for col in df_1.columns}
        return [{'label': i, 'value': i} for i in feature_options]

    @app.callback(
        Output('y-axis-feature-dropdown', 'options'),
        [Input('y-axis-dropdown', 'value')])
    def update_Y_dropdown(dataset):
        #df_2 = pd.read_csv(DATA_DIR + '/' + dataset)
        filepath = DATA_DIR + 'Global/' + dataset
        print('dataset 2 is')
        print(dataset)
        print('that was it')
        df_2 = pd.read_csv(filepath)
        feature_options = {col:col for col in df_2.columns}
        return [{'label': i, 'value': i} for i in feature_options]

    @app.callback(
        Output('table_', 'figure'),
        [Input('x-axis-dropdown', 'value'),
        Input('y-axis-dropdown', 'value'),
        Input('x-axis-feature-dropdown', 'value'),
        Input('y-axis-feature-dropdown', 'value'),
        ])
    def update_figure(xdata, ydata, featx, featy):
        fig=go.Figure()
        print(xdata)
        print(ydata)
        print(featx)
        print(featy)

        if featx is not None:
            filepath = DATA_DIR + 'Global/' + xdata
            df1 = pd.read_csv(filepath)

            print(DATASET)
            print(df1)
            df1_drop_cols = [ col for col in df1.columns if col not in ['date', 'country', featx]]
            df1.drop(df1_drop_cols, axis=1, inplace=True)

        if featy is not None:
            filepath = DATA_DIR + 'Global/' + ydata
            df2 = pd.read_csv(filepath)
            print(DATASET)
            print(df2)
            df2_drop_cols = [ col for col in df2.columns if col not in ['country', featy]]
            df2.drop(df2_drop_cols, axis=1, inplace=True)

            df = pd.merge(df1, df2, on='country')

            fig.add_trace(go.Scatter(name='', x = df[featx],  y = df[featy], mode='markers',
                marker=dict(color='#668866'),
                text=df['country'],
                xaxis = 'x',
                yaxis = 'y',
                #hover_data=["population", "first_case"]
            ))
            fig.update_layout(xaxis_type="log", xaxis_tickformat=",d")
            fig.update_layout(
                title={'text': '{} x {} by country'.format(featx, featy),
                'xanchor':"center",
                'x':.50, 'y':.9
                },
                width=1500,
                xaxis_title=featx,
                yaxis_title=featy,
                font=dict(
                    family="Trebuchet",
                    size=18,
                    color="#828f13"
                    )
                )

            return fig
        return fig # hmmm



if __name__ == '__main__':
    app.run_server(debug=True)
