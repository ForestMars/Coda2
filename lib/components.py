# components.py - provides front end reactive components using dash.
# @TODO: Why does this module export DATASET?
# breakpoint()
__version__ = '0.2'
__all__ = ['region_dropdown', 'region_dropdown_', 'region_dropdown_u2d','rangeslider', 'train_slider', 'y_slider', 'x_axis-dropdown','y-axis-dropdown']

import dash_core_components as dcc
import dash_html_components as html

import data_loader  # shouldn't be neded here
from data_loader import datasets
import common.utils  as utils # get_reg_files shold be moved from utils into data_loader class
from common.better_title import better_title
from lib.predict_data import period, dates, date_marks


LATEST = '5/25/2020'

options = [] # labels needed by app.layout


rangeslider = dcc.RangeSlider(
    id = 'slider',
    marks = date_marks,
    min = 0,
    max = period,
    value = [1, 55])


train_slider = html.Div(
    [
    html.Label("Train Period (days since patient zero)"),
    dcc.RangeSlider(id = 'train_slider',
            marks = date_marks,
            min = 0,
            max = period,
            value = [1, 55]),
    ],
    style = {'margin-top' : '33px'}
)


# This is kind of brittle in that graph doesn't work at all without y_slider -- should degrade gracefully!
y_slider = html.Div(
    [
    html.Label(''),
    dcc.RangeSlider(id = 'yslider',
        vertical = True,
        min = 0,
        max = 300000,
        value = [1, 300000]),
    ],
    style = {'backgroundColor' : '', 'width' : 'auto', 'height' : '400px', 'float' : 'left','margin-left':'10px', 'margin-right':0,'padding-right':0,'padding-left':'10px'},
)
# @TODO: import styles from CSS

def single_region_dropdown_(area: str='USA', val: str=None):
    area = None
    #for v, k in data_loader.area.items():

#    breakpoint()
    if area is not None:
        #rint(getattr(data_loader, area).items())
        for v, k in getattr(data_loader, area).items():
            options.append(dict([('label', k), ('value', v)]))
    dropdown = html.Div([
    #html.H4(""),
    #html.P("Starting Population:",
    #    style={'width':'auto', 'margin-top':'.0em', 'margin-bottom':'', 'padding-top':'.01em','backgroundColor':'#'}),
    dcc.Dropdown(
        id = 'single_region_dropdown',
        options = options,
        multi=False,
        placeholder = 'Select Geographic Region to run model on'
        ),
    #html.P("Data current up to " + LATEST),
    ],
    style={'width':'350px', 'color':'#222', 'font-color':'#222'}
    )
    return dropdown
single_region_dropdown = single_region_dropdown_()

def region_dropdown_(area: str, val: str=None):
    #for v, k in data_loader.area.items():
    if area is not None:
        #rint(getattr(data_loader, area).items())
        for v, k in getattr(data_loader, area).items():
            options.append(dict([('label', k), ('value', v)]))
    dropdown = html.Div([
    #html.H4(""),
    html.P("Select regions to display and use feeling sliders to set date range:",
        style={'width':'auto', 'margin-top':'.05em', 'margin-bottom':'', 'padding-top':'5vw','backgroundColor':'#'}),
    dcc.Dropdown(
        id = 'region_dropdown',
        options = options,
        value=val,
        multi=True
        ),
    #html.P("Data current up to " + LATEST),
    ],
    style={'width':'75%'}
    )

    return dropdown

region_dropdown = region_dropdown_(None, None) # Python, what's not to <3!
region_dropdown2 = region_dropdown_(None, None) # Python, what's not to <3!
region_dropdown_zapp = region_dropdown_(None, None) # Python, what's not to <3!
region_dropdown_wb = region_dropdown_(None, None) # Python, what's not to <3!
region_dropdown_mod = region_dropdown_(None, None) # Python, what's not to <3!

owid_countries = ['Australia', 'Austria', 'Belgium', 'Bolivia', 'Bulgaria', 'Canada', 'Croatia'
 'Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Hungary'
 'Iceland', 'Ireland', 'Israel', 'Italy', 'Japan', 'Latvia', 'Lithuania'
 'Luxembourg', 'Malaysia', 'Malta', 'Netherlands', 'Norway', 'Poland'
 'Portugal', 'Romania', 'Serbia', 'Slovakia', 'Slovenia', 'South Africa'
 'Spain', 'Sweden', 'Switzerland', 'United Kingdom', 'United States']


def region_dropdown_u2d(area: str, val: str=None):  # -> dcc.dropdown ?
    options = []
    #for v, k in data_loader.area.items():
    if area is not None:
        for c in owid_countries:
            options.append(dict([('label', c), ('value', c)]))
            #options.append(dict(['label', c), ('value', c)]))

    dropdown = html.Div([
    #html.H4(""),
    html.P("Select regions to display and use feeling sliders to set date range:",
        style={'width':'auto', 'margin-top':'.05em', 'margin-bottom':'', 'padding-top':'5vw','backgroundColor':'#'}),
    dcc.Dropdown(
        id = 'region_dropdown_',
        options = options,
        value=val,
        multi=True
        ),
    #html.P("Data current up to " + LATEST),
    ],
    style={'width':'75%'}
    )

    return dropdown


# this should be in app
x_axis_dropdown = [
    html.H4("x-Axis"),
    #html.P("Use links on right to edit, save & download"),
    dcc.Dropdown(
        id='x-axis-dropdown',
        options=[
            {'label': name, 'value': file} for file, name in datasets.items()],
        placeholder='Select a dataset to view...',
        value='current_cases_by_country.csv',
        style={'display':'block'},
        ),
    dcc.Dropdown(
        id='x-axis-feature-dropdown',
        placeholder='Select x-axis feature',
        style={'display':'block'},
        value='deaths',
        ),
]


y_axis_dropdown = [ #right
    html.H4("y-Axis"),
    #html.P("Use links on right to edit, save & download"),
    dcc.Dropdown(
        id='y-axis-dropdown',
        options=[
            {'label': name, 'value': file} for file, name in datasets.items()],
        placeholder="Select a dataset to view...",
        value="global_demographic_data.csv",
        style={'display':'block'},
        ),
    dcc.Dropdown(
        id='y-axis-feature-dropdown',
        placeholder='Select y-axis feature',
        value='population',
        style={'display':'block'},
        ),
]




USGlobal_ = [dcc.RadioItems(
                    id="USGlobal",
                    options=[
                        {'label': 'Global Case Data', 'value': 'World'},
                        {'label': 'USA Case Data', 'value': 'USA'},
                        {'label': 'New York Case Data', 'value': 'NYC'}
                        ], value='World', labelStyle={'display': 'block'}
                    )]
