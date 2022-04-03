# test_api.py
import unittest
import os
import json
from app import create_app, db


class APITestCases(unittest.TestCase):

    def __init__(self):
        pass

    def setUp(self):
        """Define test variables and initialize app."""
        self.app = create_app(config_name="testing")
        self.client = self.app.test_client
        self.api = {'name': 'API tests'}

        # binds app to current context
        with self.app.app_context():
            db.create_all()

    def test_train_creation(self):
        """Test API can create a api POST request to train a model"""
        res = self.client().post('/apis/', data=self.api)
        self.assertEqual(res.status_code, 201)
        self.assertIn('Test predict daaa, this is just to test the endpoint is respnding.', str(res.data))

    def test_api_can_get_all_jobs(self):
        """Test API can get all predict jobs finshed and running."""
        res = self.client().post('/apis/', data=self.api)
        self.assertEqual(res.status_code, 201)
        res = self.client().get('/apis/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('Success', str(res.data))

    def test_api_can_get_train_model_by_id(self):
        """Test API can get status of a single train model job."""
        post_data = self.client().post('/apis/', data=self.api)
        self.assertEqual(rv.status_code, 201)
        result_in_json = json.loads(post_data.data.decode('utf-8').replace("'", "\""))
        result = self.client().get(
            '/apis/{}'.format(result_in_json['id']))
        self.assertEqual(result.status_code, 200)
        self.assertIn('Test data', str(result.data))

    def test_api_can_be_edited(self):
        """Test API can edit an existing api. (PUT request)"""
        post_data = self.client().post(
            '/apis/',
            data={'name': 'Test data'})
        self.assertEqual(rv.status_code, 201)
        post_data = self.client().put(
            '/apis/1.0',
            data={
                "name": "Test data"
            })
        self.assertEqual(rv.status_code, 200)
        results = self.client().get('/apis/1')
        self.assertIn('Test data', str(results.data))

    def test_api_deletion(self):
        """Test API can delete a running job. (DELETE request)."""
        rv = self.client().post(
            '/apis/',
            data={'name': 'Eat, pray and love'})
        self.assertEqual(rv.status_code, 201)
        res = self.client().delete('/apis/1')
        self.assertEqual(res.status_code, 200)
        result = self.client().get('/apis/1')
        self.assertEqual(result.status_code, 404)

    def tearDown(self):
        """teardown all initialized variables."""
        with self.app.app_context():
            db.session.remove()
            db.drop_all()


if __name__ == "__main__":
    unittest.main()
