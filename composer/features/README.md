# cucumber使用说明
## 文件类型以及准备工作
在composer项目中需要将测试代码放置在features路径下，并且文件名的后缀为.feature
项目package.json中需要做出以下改动

    "test": "cucumber-js"

    "composer-cucumber-steps": "^0.19.8",
    "cucumber": "^2.2.0",
    "eslint": "latest",

 改动后需要进行npm install 进行组件补全。使用命令为npm test

## 前缀介绍
首先需要描述Feature 说明项目作用，这一段文字为描述性文字不参与具体的测试过程

首先需要准备Background信息，Background信息参与每一个Scenario的测试过程，但是每一个Scenario测试过程相互独立，所以不可以使用上一个Scenario中的信息作为下一个Scenario的条件。
Background描述第一行需要描述进行的测试的工作 ```Given I have deployed the business network definition ..``` 这个描述为测试区块链代码。此处代码为固定代码。

测试用例中有三种语法，分别为When And Then三个前缀。其中When前缀为测试开始信息，And为进行测试的步骤，包括资产、参与者的输入，submit的提交等动作。这个测试代码将直接影响去区块链中的信息并且在Scenario结束后将不会保留。

Then语法为测试结果校验过程。此处可以校验本Scenario中所有动作所获得的结果，测试的结果的实际结果可与预期结果相比较，在终端中以绿色和红色+ - 标注。（此处发现问题是，有时候会无法显示特殊字符例如#,原因可能是系统语言的问题？)

## 语法介绍

cucumber语法接近自然语言 常用的动词有have add submit 
以下面的语句为示例
    I should have the following assets of type org.xuyuntech.health.CaseItem

主语 I 状态描述 should 描述性状态 have 资源属性描述 assests 资源属性名  org.xuyuntech.health.CaseItem

基础语法为此。其中资源属性描述和资源属性名可以针对cto模型中定义进行更换 状态描述和描述性状态也可进行更换比如submit add 

## 后续进展
cucumber应该支持中文，但是现在不会。。此后可能进行维护。