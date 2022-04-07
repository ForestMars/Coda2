# zapp.py - Reactive data viz app template for Coda.to

__version__ = '0.1'
__all__ = ['layout', 'callback']


import os

import pandas as pd
import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output
from dateparser.search import search_dates

from app import app
import assets.footer as footer
import dashit
import data_loader

from build.src import qa


df = pd.read_csv(data_loader.DATASET2, parse_dates=['dateRep'], infer_datetime_format=True)  # dateRep
df.rename(columns = {'dateRep':'date', 'countriesAndTerritories':'nation'}, inplace = True)


def sent_parser(qa_text):
    """ Limits inquiries to 1 question at a time. Does catch compound questions. """
    q_num = qa.text.count('?')
    if q_num > 1:
        return "I can answer all your questions, but please ask them one at a time."

def ex_date(qa_date):
    """ Given date entities from a query, extract the date intent """
    date = ''
    return date

#ex_date = parse(qa_date, fuzzy=True))
try:
    ex_date = parse(qa_date, fuzzy=True)
    print(ex_date)
except Exception as e:
    #raise new ParseError
    print(e)




#input(matches)
#ex = '2020-04-01'
# matches = datefinder.find_dates(ex)
#for m in matches:
#    print(m)


#df.query = df1 = df.query('date'=date and 'country'=qa_region)




# I miss Jade.
def get_layout():
    # title = 'Time Series Plot', hovermode = 'closest'

    app.layout = html.Div([
        html.Div(
            style = {'padding-left': '25px', 'padding-right': '25px', 'backgroundColor': '#aa0'},
        ),
        html.Div([
            html.Div([],
                style = {'backgroundColor':'#a0a','height':'auto', 'float':'left','margin-left':0, 'margin-right':0,'padding-right':0,'padding-left':0},
                ),
            html.Div([
                dcc.Input(
                    id='qa_input',
                    #type=,
                    placeholder='ask your question',
                    ),
                #html.P(['Sample questions you could ask me...'])
                ],
                style = {'backgroundColor':'0aa','width':'95vw', 'text-align':'center', 'height':'auto','margin-top':0,'padding-top':0,'margin-left':0,'padding-left':0,'float':'left'},
                ),
            html.Div([
                html.P([''],
                    id='answer-div',
                    style = {'backgroundColor':'#', 'width' :'100%', 'height' :'100%', 'float':'left', 'padding':0, 'margin':0, 'margin-right':0},
                    ),
                ],
                id='answer-div',
                style = {'backgroundColor' : '#', 'width' : '100%', 'min-height':'100%','padding':0,'margin':0,'margin-right':0, 'top':'200px', 'position':'relative'},
                ),
            ],
            style = {'backgroundColor' : '#', 'height':'100%', 'width':'100vw', 'min-height':'480px', 'margin-right':0, 'text-align':'center'},
            ),
        html.P([],
                style = {'width' : '80%',
                        'fontSize' : '20px',
                        'padding-top' : '1px',
                        'padding-left' : '100px',
                        'display': 'inline-block'},
            ),
        footer.get_footer_links(),
        footer.get_footer_tos(),
        ])
    return app.layout

layout = get_layout()



def callback(app):
    @app.callback(
        Output('answer-div', 'children'),
        [Input('qa_input', 'value'),
        ])
    # may need another callback here to clear answer to previous question.
    def update_question_answer(question_text):

        print(question_text)
        answer = ''
        if question_text is not None and question_text[-1] =='?':
            question = qa.Question(question_text)
            results = qa.HowManyResults(question, df) # Results obj could obvi load df for itself, but that would be an antipattern here.
            #df = results.update_df()
            answer = qa.Answer()

            return answer.grammatical_answer(results)
