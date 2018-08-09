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
        And I have added the following participant of type org.xuyuntech.health.Patient
            |name | realName|
            |si.li|李四 |
        And I have added the following participant of type org.xuyuntech.health.Doctor
            |name |realName |title |description |skilledIn |
            |san.zhang |医师一 |主任医师 |医生描述信息 |医生 skilledIn 信息 |
        And I have added the following assets of type org.xuyuntech.health.Visitor
            |id |sid | realName|creator |
            |visitor-1 |13271637821678 |就诊人 |si.li |
        And I have added the following assets of type org.xuyuntech.health.Hospital
            |id | name| reservationQuantity |
            |hospital-1 |医院一|1 |
        And I have added the following assets of type org.xuyuntech.health.Department1
            |id |name |hospital |
            |dep1-1 |dep1 |hospital-1 |
        And I have added the following assets of type org.xuyuntech.health.Department2
            """
            {
                "id": "dep2-1",
                "name": "dep2",
                "doctors": ["resource:org.xuyuntech.health.Doctor#san.zhang"],
                "$class": "org.xuyuntech.health.Department2",
                "department1": "resource:org.xuyuntech.health.Department1#dep1-1"
            }
            """
        And I have added the following assets of type org.xuyuntech.health.ArrangementHistory
            |id |visitDate |visitTime |hospital |doctor |department1 |department2 |
            |arrangement-1 |2018-07-16T05:00:00.000Z |AM |hospital-1 |san.zhang |dep1-1 |dep2-1 |
        And I have added the following assets of type org.xuyuntech.health.ArrangementHistory
            |id |visitDate |visitTime |hospital |doctor |department1 |department2 |
            |arrangement-2 |2018-07-16T05:00:00.000Z |AM |hospital-1 |san.zhang |dep1-1 |dep2-1 |
        And I have added the following assets of type org.xuyuntech.health.RegisterHistory
            """
            {
                "id": "si.li-arrangement-2",
                "state": "Init",
                "diseaseInfo": "diseaseInfo...",
                "type": "First",
                "visitor": {
                    "id": "visitor-1",
                    "sid": "13271637821678",
                    "realName": "就诊人",
                    "creator": "si.li"
                },
                "number": "RH201898989800332",
                "patient": "resource:org.xuyuntech.health.Patient#si.li",
                "arrangementHistory": "resource:org.xuyuntech.health.ArrangementHistory#arrangement-2",
                "$class": "org.xuyuntech.health.RegisterHistory"
            }
            """
        And I have issued the participant org.xuyuntech.health.Patient#si.li with the identity si.li
    Scenario: QueryRHByHospital
        When I submit the following transaction of type org.xuyuntech.health.QueryRegisterHistoryByHospital
        """
        {
            "hospital": "resource:org.xuyuntech.health.Hospital#hospital-1",
            "$class": "org.xuyuntech.health.QueryRegisterHistoryByHospital"
        }
        """
    Scenario: InitRegisterAction
        When I use the identity si.li
        And I submit the following transaction of type org.xuyuntech.health.InitRegisterAction
        """
        {
            "diseaseInfo": "diseaseInfo...",
            "type": "First",
            "number": "RH201898989800339",
            "visitor": {
                "id": "visitor-1",
                "sid": "13271637821678",
                "realName": "就诊人",
                "creator": "si.li"
            },
            "arrangementHistory": "arrangement-1",
            "$class": "org.xuyuntech.health.InitRegisterAction"
        }
        """
        Then I should have the following assets of type org.xuyuntech.health.RegisterHistory
        """
        {
            "id": "si.li-arrangement-1",
            "state": "Init",
            "diseaseInfo": "diseaseInfo...",
            "type": "First",
            "visitor": {
                "id": "visitor-1",
                "sid": "13271637821678",
                "realName": "就诊人",
                "creator": "si.li"
            },
            "number": "RH201898989800339",
            "patient": "resource:org.xuyuntech.health.Patient#si.li",
            "arrangementHistory": "resource:org.xuyuntech.health.ArrangementHistory#arrangement-1",
            "$class": "org.xuyuntech.health.RegisterHistory"
        }
        """
        And I should have the following assets of type org.xuyuntech.health.Hospital
            |id | name| reservationQuantity |
            |hospital-1 |医院一|2 |
        And I should have the following participant of type org.xuyuntech.health.Doctor
            |name |realName |title |description |skilledIn |reservationQuantity |
            |san.zhang |医师一 |主任医师 |医生描述信息 |医生 skilledIn 信息 |1 |
    Scenario: OperateArrangementAction
        When I use the identity si.li
        And I submit the following transaction of type org.xuyuntech.health.OperateArrangementAction
        """
        {
            "operate": "cancel",
            "arrangementHistory": "arrangement-1",
            "$class": "org.xuyuntech.health.OperateArrangementAction"
        }
        """
        Then I should have the following assets of type org.xuyuntech.health.ArrangementHistory
            |id             |visitDate                  |visitTime  |hospital   |doctor     |department1    |department2    |state      |
            |arrangement-1  |2018-07-16T05:00:00.000Z   |AM         |hospital-1 |san.zhang  |dep1-1         |dep2-1         |Cancel     |