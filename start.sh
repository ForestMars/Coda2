# start.sh - Start up script for Jira TPM

echo "Sourcing ENV variables"
source .env

echo "Sourcing authentication keys"
# if [[ condition ]]; then
  #statements
# fi
source .auth

python run.py
