#!/usr/bin/env python3
"""
Backend API Testing for StickersXTon Activity Management
Tests all Activity Management API endpoints with comprehensive scenarios
"""

import requests
import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

# Configuration
BACKEND_URL = "https://stickersxton.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class ActivityAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.test_results = []
        self.created_activity_id = None
        
    def log_test(self, test_name: str, success: bool, message: str, details: Optional[Dict] = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def admin_login(self) -> bool:
        """Test admin login and get auth token"""
        try:
            response = requests.post(
                f"{self.base_url}/admin/login",
                json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("token"):
                    self.auth_token = data["token"]
                    self.log_test("Admin Login", True, "Successfully authenticated as admin")
                    return True
                else:
                    self.log_test("Admin Login", False, "Login response missing token", {"response": data})
                    return False
            else:
                self.log_test("Admin Login", False, f"Login failed with status {response.status_code}", 
                            {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Login request failed: {str(e)}")
            return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        if not self.auth_token:
            raise Exception("No auth token available")
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    def test_simulate_activity(self, count: int = 5) -> bool:
        """Test creating sample activities"""
        try:
            response = requests.post(
                f"{self.base_url}/admin/simulate-activity",
                params={"count": count},
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Simulate Activity", True, f"Created {count} sample activities")
                    return True
                else:
                    self.log_test("Simulate Activity", False, "Simulation failed", {"response": data})
                    return False
            else:
                self.log_test("Simulate Activity", False, f"Request failed with status {response.status_code}",
                            {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test("Simulate Activity", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_all_activities(self) -> bool:
        """Test getting all activities without filters"""
        try:
            response = requests.get(
                f"{self.base_url}/admin/activity",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                activities = response.json()
                if isinstance(activities, list):
                    self.log_test("Get All Activities", True, f"Retrieved {len(activities)} activities")
                    
                    # Check that activities don't have MongoDB _id fields
                    for activity in activities[:3]:  # Check first 3
                        if "_id" in activity:
                            self.log_test("MongoDB _id Check", False, "Activities contain MongoDB _id field")
                            return False
                    
                    self.log_test("MongoDB _id Check", True, "Activities properly exclude MongoDB _id field")
                    return True
                else:
                    self.log_test("Get All Activities", False, "Response is not a list", {"response": activities})
                    return False
            else:
                self.log_test("Get All Activities", False, f"Request failed with status {response.status_code}",
                            {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test("Get All Activities", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_packs_for_filters(self) -> List[str]:
        """Get available pack names for filter testing"""
        try:
            response = requests.get(f"{self.base_url}/packs", timeout=10)
            if response.status_code == 200:
                packs = response.json()
                pack_names = [pack["name"] for pack in packs if isinstance(pack, dict) and "name" in pack]
                self.log_test("Get Packs for Filters", True, f"Retrieved {len(pack_names)} pack names")
                return pack_names[:3]  # Return first 3 for testing
            else:
                self.log_test("Get Packs for Filters", False, f"Failed to get packs: {response.status_code}")
                return []
        except Exception as e:
            self.log_test("Get Packs for Filters", False, f"Request failed: {str(e)}")
            return []
    
    def test_activity_filters(self, pack_names: List[str]) -> bool:
        """Test activity filtering functionality"""
        all_passed = True
        
        # Test collection filter
        if pack_names:
            try:
                response = requests.get(
                    f"{self.base_url}/admin/activity",
                    params={"collection": pack_names[0]},
                    headers=self.get_auth_headers(),
                    timeout=10
                )
                
                if response.status_code == 200:
                    activities = response.json()
                    self.log_test("Collection Filter", True, 
                                f"Collection filter returned {len(activities)} activities")
                else:
                    self.log_test("Collection Filter", False, f"Filter failed: {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test("Collection Filter", False, f"Request failed: {str(e)}")
                all_passed = False
        
        # Test action filter
        for action in ["bought", "opened", "listed", "sold", "burned"]:
            try:
                response = requests.get(
                    f"{self.base_url}/admin/activity",
                    params={"action": action},
                    headers=self.get_auth_headers(),
                    timeout=10
                )
                
                if response.status_code == 200:
                    activities = response.json()
                    self.log_test(f"Action Filter ({action})", True, 
                                f"Action filter returned {len(activities)} activities")
                else:
                    self.log_test(f"Action Filter ({action})", False, f"Filter failed: {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"Action Filter ({action})", False, f"Request failed: {str(e)}")
                all_passed = False
        
        # Test time range filters
        for time_range in ["1h", "24h", "7d", "all"]:
            try:
                response = requests.get(
                    f"{self.base_url}/admin/activity",
                    params={"time_range": time_range},
                    headers=self.get_auth_headers(),
                    timeout=10
                )
                
                if response.status_code == 200:
                    activities = response.json()
                    self.log_test(f"Time Range Filter ({time_range})", True, 
                                f"Time range filter returned {len(activities)} activities")
                else:
                    self.log_test(f"Time Range Filter ({time_range})", False, f"Filter failed: {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"Time Range Filter ({time_range})", False, f"Request failed: {str(e)}")
                all_passed = False
        
        # Test combined filters
        if pack_names:
            try:
                response = requests.get(
                    f"{self.base_url}/admin/activity",
                    params={
                        "collection": pack_names[0],
                        "action": "bought",
                        "time_range": "24h"
                    },
                    headers=self.get_auth_headers(),
                    timeout=10
                )
                
                if response.status_code == 200:
                    activities = response.json()
                    self.log_test("Combined Filters", True, 
                                f"Combined filters returned {len(activities)} activities")
                else:
                    self.log_test("Combined Filters", False, f"Combined filter failed: {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test("Combined Filters", False, f"Request failed: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_create_activity(self) -> bool:
        """Test creating a new activity"""
        activity_data = {
            "pack_name": "Test Collection",
            "action": "bought",
            "price": 5.5,
            "price_type": "TON",
            "is_free": False,
            "is_simulation": False
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/admin/activity",
                json=activity_data,
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("activity"):
                    activity = data["activity"]
                    self.created_activity_id = activity.get("id")
                    self.log_test("Create Activity", True, "Successfully created new activity",
                                {"activity_id": self.created_activity_id})
                    
                    # Verify activity data
                    if (activity.get("pack_name") == activity_data["pack_name"] and
                        activity.get("action") == activity_data["action"] and
                        activity.get("price") == activity_data["price"]):
                        self.log_test("Activity Data Validation", True, "Created activity has correct data")
                        return True
                    else:
                        self.log_test("Activity Data Validation", False, "Created activity has incorrect data",
                                    {"expected": activity_data, "actual": activity})
                        return False
                else:
                    self.log_test("Create Activity", False, "Creation response missing activity data", {"response": data})
                    return False
            else:
                self.log_test("Create Activity", False, f"Creation failed with status {response.status_code}",
                            {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test("Create Activity", False, f"Request failed: {str(e)}")
            return False
    
    def test_update_activity(self) -> bool:
        """Test updating an existing activity"""
        if not self.created_activity_id:
            self.log_test("Update Activity", False, "No activity ID available for update test")
            return False
        
        update_data = {
            "pack_name": "Updated Test Collection",
            "price": 7.5,
            "action": "sold"
        }
        
        try:
            response = requests.put(
                f"{self.base_url}/admin/activity/{self.created_activity_id}",
                json=update_data,
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Update Activity", True, "Successfully updated activity")
                    
                    # Verify the update by fetching the activity
                    return self.verify_activity_update(update_data)
                else:
                    self.log_test("Update Activity", False, "Update response indicates failure", {"response": data})
                    return False
            else:
                self.log_test("Update Activity", False, f"Update failed with status {response.status_code}",
                            {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test("Update Activity", False, f"Request failed: {str(e)}")
            return False
    
    def verify_activity_update(self, expected_data: Dict) -> bool:
        """Verify that activity was updated correctly"""
        try:
            # Get all activities and find our updated one
            response = requests.get(
                f"{self.base_url}/admin/activity",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                activities = response.json()
                updated_activity = None
                
                for activity in activities:
                    if activity.get("id") == self.created_activity_id:
                        updated_activity = activity
                        break
                
                if updated_activity:
                    if (updated_activity.get("pack_name") == expected_data["pack_name"] and
                        updated_activity.get("price") == expected_data["price"] and
                        updated_activity.get("action") == expected_data["action"]):
                        self.log_test("Update Verification", True, "Activity update verified successfully")
                        return True
                    else:
                        self.log_test("Update Verification", False, "Updated activity has incorrect data",
                                    {"expected": expected_data, "actual": updated_activity})
                        return False
                else:
                    self.log_test("Update Verification", False, "Updated activity not found in list")
                    return False
            else:
                self.log_test("Update Verification", False, f"Failed to fetch activities for verification: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Update Verification", False, f"Verification request failed: {str(e)}")
            return False
    
    def test_delete_activity(self) -> bool:
        """Test deleting an activity"""
        if not self.created_activity_id:
            self.log_test("Delete Activity", False, "No activity ID available for delete test")
            return False
        
        try:
            response = requests.delete(
                f"{self.base_url}/admin/activity/{self.created_activity_id}",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Delete Activity", True, "Successfully deleted activity")
                    
                    # Verify deletion by trying to find the activity
                    return self.verify_activity_deletion()
                else:
                    self.log_test("Delete Activity", False, "Delete response indicates failure", {"response": data})
                    return False
            else:
                self.log_test("Delete Activity", False, f"Delete failed with status {response.status_code}",
                            {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test("Delete Activity", False, f"Request failed: {str(e)}")
            return False
    
    def verify_activity_deletion(self) -> bool:
        """Verify that activity was deleted"""
        try:
            response = requests.get(
                f"{self.base_url}/admin/activity",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                activities = response.json()
                
                for activity in activities:
                    if activity.get("id") == self.created_activity_id:
                        self.log_test("Delete Verification", False, "Deleted activity still exists in list")
                        return False
                
                self.log_test("Delete Verification", True, "Activity deletion verified successfully")
                return True
            else:
                self.log_test("Delete Verification", False, f"Failed to fetch activities for verification: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Delete Verification", False, f"Verification request failed: {str(e)}")
            return False
    
    def test_error_scenarios(self) -> bool:
        """Test error handling scenarios"""
        all_passed = True
        
        # Test unauthorized access (without token)
        try:
            response = requests.get(f"{self.base_url}/admin/activity", timeout=10)
            if response.status_code == 401:
                self.log_test("Unauthorized Access", True, "Properly rejected unauthorized request")
            else:
                self.log_test("Unauthorized Access", False, f"Expected 401, got {response.status_code}")
                all_passed = False
        except Exception as e:
            self.log_test("Unauthorized Access", False, f"Request failed: {str(e)}")
            all_passed = False
        
        # Test invalid activity ID for update
        try:
            response = requests.put(
                f"{self.base_url}/admin/activity/invalid-id",
                json={"pack_name": "Test"},
                headers=self.get_auth_headers(),
                timeout=10
            )
            if response.status_code == 404:
                self.log_test("Invalid Update ID", True, "Properly handled invalid activity ID for update")
            else:
                self.log_test("Invalid Update ID", False, f"Expected 404, got {response.status_code}")
                all_passed = False
        except Exception as e:
            self.log_test("Invalid Update ID", False, f"Request failed: {str(e)}")
            all_passed = False
        
        # Test invalid activity ID for delete
        try:
            response = requests.delete(
                f"{self.base_url}/admin/activity/invalid-id",
                headers=self.get_auth_headers(),
                timeout=10
            )
            if response.status_code == 404:
                self.log_test("Invalid Delete ID", True, "Properly handled invalid activity ID for delete")
            else:
                self.log_test("Invalid Delete ID", False, f"Expected 404, got {response.status_code}")
                all_passed = False
        except Exception as e:
            self.log_test("Invalid Delete ID", False, f"Request failed: {str(e)}")
            all_passed = False
        
        return all_passed
    
    def run_all_tests(self):
        """Run all activity management tests"""
        print("=" * 60)
        print("STICKERSXTON ACTIVITY MANAGEMENT API TESTS")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print()
        
        # Step 1: Admin login
        if not self.admin_login():
            print("\n❌ CRITICAL: Admin login failed. Cannot proceed with tests.")
            return False
        
        print()
        
        # Step 2: Create sample activities
        self.test_simulate_activity(5)
        time.sleep(1)  # Brief pause
        
        # Step 3: Test getting all activities
        self.test_get_all_activities()
        
        # Step 4: Get pack names for filter testing
        pack_names = self.test_get_packs_for_filters()
        
        # Step 5: Test activity filters
        print("\n--- Testing Activity Filters ---")
        self.test_activity_filters(pack_names)
        
        # Step 6: Test CRUD operations
        print("\n--- Testing CRUD Operations ---")
        if self.test_create_activity():
            self.test_update_activity()
            self.test_delete_activity()
        
        # Step 7: Test error scenarios
        print("\n--- Testing Error Scenarios ---")
        self.test_error_scenarios()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['message']}")
        
        print(f"\nTest completed at: {datetime.now().isoformat()}")
        
        return passed == total

def main():
    """Main test execution"""
    tester = ActivityAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED!")
        exit(0)
    else:
        print("\n💥 SOME TESTS FAILED!")
        exit(1)

if __name__ == "__main__":
    main()