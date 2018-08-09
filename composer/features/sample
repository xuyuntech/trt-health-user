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
        Given I have deployed the business network definition ..
        And I have added the following participant of type org.xuyuntech.health.Patient
            |participantKey | phone | name|
            |5671 | 13333333333|张三|
        And I have added the following participant of type org.xuyuntech.health.Doctor
            |participantKey | phone | name| title | description |
            |5672           | 13333333333|李四| 主任医师 | 全科|
        And I have added the following participant of type org.xuyuntech.health.Hospital
            |id|name|
            |1 | 大铁棍子医院|
        And I have added the following participant of type org.xuyuntech.health.Supplier
            | id | name | address | zipCode | telephone | fax | webSite |
            | 1  | 恒瑞  |123   |123      |123        |123  |123      |
            | 2  | 康缘  |123   |123      |123        |123  |123      |
        And I have added the following asset of type org.xuyuntech.health.ArrangementHistory
        |assetKey|description|visitDate|visitTime|hospital|doctor|
        |4313|123123|2018-06-22T11:17:43.855Z|AM|1|5672|

        And I have added the following asset of type org.xuyuntech.health.RegisterHistory
            | id  | state | created | patient | arrangementHistory |
            |1234|Register|2018-06-22T11:17:43.855Z|5671|4313|
        And I have added the following asset of type org.xuyuntech.health.MedicalItem
        |id | title | quantity | price | barcode | batchNumber | permissionNumber | productionDate | expiredDate | supplier |
        |1|藿香正气水|10|5.0|123|123|123|2018-06-23T11:17:43.855Z|2018-06-25T11:17:43.855Z|1|
        |2|健胃消食片|10|15.0|123|123|123|2018-06-24T10:17:43.855Z|2018-06-28T11:17:43.855Z|1|
    Scenario: 
        When I submit the following transaction of type org.xuyuntech.health.visiting
        | registerHistory|
        |1234|

        Then I should have the following assets of type org.xuyuntech.health.RegisterHistory
            | id  | state | created | patient | arrangementHistory |
            |1234|Visiting|2018-06-22T11:17:43.855Z|5671|4313|
    

    Scenario: 
        When I submit the following transaction of type org.xuyuntech.health.visiting
            | registerHistory|
            |1234|

        # When I submit the following transaction of type org.xuyuntech.health.Prescribe
        #     | registerHistory| participantKey_CaseItem |  doctor | hospital | complained | number_CaseItem | diagnose | history | familyHistory | created | participantKey_Prescription | number_Prescription |
        #     |1234| 1 | 5672|1|123|123|123|123|123|2018-06-22T11:17:43.855Z|1|1|
        And I submit the following transaction
        """
        [
       {
  "$class": "org.xuyuntech.health.Prescribe",
  "registerHistory": "resource:org.xuyuntech.health.RegisterHistory#1234",
  "participantKey_CaseItem": "1",
  "doctor": "resource:org.xuyuntech.health.Doctor#5672",
  "hospital": "resource:org.xuyuntech.health.Hospital#1",
  "complained": "123",
  "diagnose": "123",
  "history": "123",
  "familyHistory": "123",
  "created": "2018-06-22T11:17:43.855Z",
  "participantKey_Prescription": "1",
  "medicalItems": ["resource:org.xuyuntech.health.MedicalItem#1","resource:org.xuyuntech.health.MedicalItem#2"],
  "count":[1,2],
  "participantKey_OrderItem":"1",
  "price":[10,20],
  "participantKey_Order":"1",
  "orderstate":"NotPaid"

}
        ]
        """
        Then I should have the following assets of type org.xuyuntech.health.CaseItem
        | participantKey | patient | doctor | hospital | complained | number | diagnose | history | familyHistory | created | 
        | 1 | 5671| 5672|1|123|1|123|123|123|2018-06-22T11:17:43.855Z|

        Then I should have the following assets 
        """
        [
           {
  "$class": "org.xuyuntech.health.Prescription",
  "participantKey": "1",
  "number": "1",
  "created": "2018-06-22T11:17:43.855Z",
  "doctor": "resource:org.xuyuntech.health.Doctor#5672",
  "patient": "resource:org.xuyuntech.health.Patient#5671",
  "medicalItems": ["resource:org.xuyuntech.health.MedicalItem#1","resource:org.xuyuntech.health.MedicalItem#2"],
  "count":[1,2],
  "registerHistory": "resource:org.xuyuntech.health.RegisterHistory#1234",
  "caseItem": "resource:org.xuyuntech.health.CaseItem#1"
} 
        ]
        """

        Then I should have the following assets
               """
        [
{
  "$class": "org.xuyuntech.health.OrderItem",
  "participantKey": "1_0",
  "number": "1_0",
  "medicalItem": "resource:org.xuyuntech.health.MedicalItem#1",
  "count": 1,
  "price": 10,
  "spending": 10
},
{
  "$class": "org.xuyuntech.health.OrderItem",
  "participantKey": "1_1",
  "number": "1_1",
  "medicalItem": "resource:org.xuyuntech.health.MedicalItem#2",
  "count": 2,
  "price": 20,
  "spending": 40
}


        ]
        """ 

         Then I should have the following assets
          """
          [
    {
  "$class": "org.xuyuntech.health.Order",
  "participantKey": "1",
  "number": "1",
  "state": "NotPaid",
  "created": "2018-06-22T11:17:43.855Z",
  "spending": 50,
  "orderItem": ["resource:org.xuyuntech.health.OrderItem#1_0","resource:org.xuyuntech.health.OrderItem#1_1"],
  "prescription": "resource:org.xuyuntech.health.Prescription#1",
  "registerHistory": "resource:org.xuyuntech.health.RegisterHistory#1234",
  "patient": "resource:org.xuyuntech.health.Patient#5671",
  "caseItem": "resource:org.xuyuntech.health.CaseItem#1"
}
          ]
           """

            Then I should have the following assets of type org.xuyuntech.health.RegisterHistory
            | id  | state | created | patient | arrangementHistory |
            |1234|Finished|2018-06-22T11:17:43.855Z|5671|4313|
    
                When I submit the following transaction 
          """
          [
    {
  "$class":"org.xuyuntech.health.finish",
  "participantKey_finish":"1",
  "number":"1",
  "outboundTime":"2018-06-25T11:17:43.855Z",
  "order":"resource:org.xuyuntech.health.Order#1",
  "prescription":"resource:org.xuyuntech.health.Prescription#1",
  "registerHistory":"resource:org.xuyuntech.health.RegisterHistory#1234",
  "medicalItems": ["resource:org.xuyuntech.health.MedicalItem#1","resource:org.xuyuntech.health.MedicalItem#2"]
}
          ]
           """


        Then I should have the following assets of type org.xuyuntech.health.MedicalItem
        |id | title | quantity | price | barcode | batchNumber | permissionNumber | productionDate | expiredDate | supplier |
        |1|藿香正气水|9|5.0|123|123|123|2018-06-23T11:17:43.855Z|2018-06-25T11:17:43.855Z|1|
        |2|健胃消食片|8|15.0|123|123|123|2018-06-24T10:17:43.855Z|2018-06-28T11:17:43.855Z|1|