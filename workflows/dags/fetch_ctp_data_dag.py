import os
import sys
from datetime import datetime as dt

from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from airflow.operators.bash_operator import BashOperator

from common.add_path import add_path # move airflow.cfg back to config

with add_path(os.environ['EST_HOME']):
    etl = __import__('etl.etl')
    utils = __import__('common.utils')

args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'start_date': dt(2020, 3, 1),
    #'email': ['admin@DOMAIN'],
    #'email_on_failure': True,
    #'email_on_retry': True,
    #'retries': 1,
    #'retry_delay': timedelta(minutes=5),
    }

dag = DAG(
    dag_id='fetch_ctp_data_dag',
    description='DAG to retrieve Covid Tracking Project data',
    default_args=args,
    schedule_interval='1 12 * * *',
    start_date=dt(2019, 12, 4),
    catchup=False
    )

def fetch_ctp_data():
    get_ctp_data = etl.etl.GetCTPData()
    process_ctp_data = etl.etl.ProcessCTPData()

    ctp_data = get_ctp_data.get_state_historic()

    home = os.environ['EST_HOME']
    os.chdir(home + '/Datasets')
    os.system('cp -r USA .USA')
    os.system('touch ' + home + '/Datasets/__meta__/usa-last_updated')

    ctp_data = process_ctp_data.keep_cols(ctp_data)
    process_ctp_data.parse_state_daily_data(ctp_data)  # (now called historic, not daily)
    os.system('echo ' + str(dt.now()) + ' >> ' + home + 'Datasets/__meta__/usa-last_updated')

    #return ctp_data
    return 'U.S. Covid Data was fetched'

#def save_ctp_data():
    #return 'US Covid Data was updated'

cp_dataset_dir = 'cd  $EST_HOME/Datasets && cp -r USA .USA '
#git_add = 'cd ' + $EST_HOME + '/Datasets && git add . ' # Don't forget trailing space.
#git_commit = 'git commit -M "Dataset updated and backed up at ' + str(dt.now()) + ' " ' # Don't forget trailing space.

fetch_data_operator = PythonOperator(task_id='fetch_ctp_data_task', python_callable=fetch_ctp_data, dag=dag)
#backup_prev_data_operator = BashOperator(task_id='run_transport', bash_command=cp_dataset_dir, dag=dag)
#backup_data_git_add_operator = BashOperator(task_id='run_transport', bash_command=git_add, dag=dag)
#backup_data_git_commit_operator = BashOperator(task_id='run_transport', bash_command=git_commit, dag=dag)
#save_data_operator = PythonOperator(task_id='fetch_ctp_data_task', python_callable=save_ctp_data, dag=dag)

#fetch_data_operator >> backup_prev_data_operator >> save_data_operator

if __name__ == '__main__':
    fetch_ctp_data()
