#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
Feature: Sample
Background:
Feature: Sample

    Background:
        Given I have deployed the business network definition ..
        And I have added the following assets of type org.xuyuntech.health.Hospital
            |id | name|
            |hospital-1 |医院一|
        And I have added the following participant of type org.xuyuntech.health.Doctor
            |name |realName |title |description |skilledIn |
            |san.zhang |医师一 |主任医师 |医生描述信息 |医生 skilledIn 信息 |
    Scenario: InitDepartment1
        When I submit the following transaction of type org.xuyuntech.health.InitDepartment1
        """
        {
            "department1s": [{
                "id": "dep1id",
                "name": "dep1",
                "hospital": "hospital-1"
            }],
            "department2s": [{
                "id": "dep2id",
                "name": "dep2",
                "doctors": ["san.zhang"],
                "department1": "dep1id"
            }],
            "$class": "org.xuyuntech.health.InitDepartment1"
        }
        """
        Then I should have the following assets of type org.xuyuntech.health.Department1
        """
        {
            "id": "dep1id",
            "name": "dep1",
            "hospital": "resource:org.xuyuntech.health.Hospital#hospital-1",
            "$class": "org.xuyuntech.health.Department1"
        }
        """
        And I should have the following assets of type org.xuyuntech.health.Department2
        """
        {
            "id": "dep2id",
            "name": "dep2",
            "doctors": ["resource:org.xuyuntech.health.Doctor#san.zhang"],
            "department1": "org.xuyuntech.health.Department1#dep1id",
            "$class": "org.xuyuntech.health.Department2"
        }
        """