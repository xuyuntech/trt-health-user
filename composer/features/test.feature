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
            |zhang.san|张三|
        And I have added the following participant of type org.xuyuntech.health.Doctor
        |name | realName| title | description | skilledIn|
        |lee.si|李四|主任医师|全科|胃病|
        And I have added the following assets of type org.xuyuntech.health.Visitor
        |id|realName|sid|creator|
        |1|张三|1|zhang.san|
        And I have added the following participant of type org.xuyuntech.health.Hospital
            |id|name|
            |1 | 大铁棍子医院|
        And I have added the following participant of type org.xuyuntech.health.Supplier
            | id | name | address | zipCode | telephone | fax | webSite |
            | 1  | 恒瑞  |123   |123      |123        |123  |123      |
            | 2  | 康缘  |123   |123      |123        |123  |123      |
        And I have added the following assets of type org.xuyuntech.health.Department1
        |id|name|hospital|
        |1|中医|1|
        |2|内科|1|


        And I have added the following asset
        """
        [
            {
  "$class": "org.xuyuntech.health.ArrangementHistory",
  "id": "4313",
  "visitDate": "2018-07-05T10:21:32.786Z",
  "visitTime": "AM",
  "hospital": "resource:org.xuyuntech.health.Hospital#1",
  "doctor": "resource:org.xuyuntech.health.Doctor#lee.si",
  "department1": "resource:org.xuyuntech.health.Department1#1",
  "department2": "resource:org.xuyuntech.health.Department2#1"
            }
        ]
        """

        And I have added the following asset of type org.xuyuntech.health.RegisterHistory
            | id  | state | created | patient | arrangementHistory |diseaseInfo|type|visitor|
            |1234|Register|2018-06-22T11:17:43.855Z|5671|4313|123|First|1|
    