var app = angular.module('myApp', []);
var paramList = {};
var builderId = 0;

app.controller('mainCtrl', function () {
    console.log("Main");
});

app.controller('texCtrl', function () {});

app.controller('itemBuilderCtrl', function ($scope, $compile) {
    console.log("Item Builder");
    console.log($scope.user)
    //var builder = this;
    $scope.builder = {
        pc: "1234",
        desc: "description",
        qty: "1",
        total: "100"
    }

    $scope.remove = function (item) {
        var idx = $scope.user.items.indexOf(item);
        $scope.user.items.splice(idx,1);
    }

    $scope.add = function () {
        var item = angular.copy($scope.builder);
        $scope.user.items.push(item);
    }

    $scope.$on('reset', function (e) {
        $scope.$parent.msg = ($scope.resetItems())
    });

    $scope.resetItems = function () {
        var table = document.getElementById("itemsTable");
        var trLength = table.rows.length;

        for (i = 1; i < trLength; i++) {
            table.deleteRow(1);
        }
    }
});


app.controller('formCtrl', function ($scope) {
    console.log("formCtrl");

    var editor = ace.edit("requestForm");
    editor.setTheme("ace/theme/chrome");
    editor.session.setMode("ace/mode/html");
    editor.setFontSize(11);

    $scope.user = {
        reference: "ay-201803211508",
        amount: "300",
        currency: "AUD",
        return_path: "https://gateway-sandbox.ipsi.com.au/",
        card_holder: "me",
        card_number: "4377320000008309",
        expiry_month: "12",
        expiry_year: "2018",
        cvv: "123",
    };

    $scope.user.items = [];
    $scope.reset = function () {
        $scope.user = {};
        $scope.user.items = [];
        $scope.$broadcast('reset');
    };

    $scope.createForm = function () {
        var formJson = $scope.user;
        var requestText = "<form name=\"dataForm\" action=\"https://gateway-sandbox.ipsi.com.au/v2/purchases/direct/lfs-000407223\" method=\"POST\">\n";
        //var requestForm = document.getElementById("requestForm");

        console.log(Object.keys(formJson).length + "\n");
        console.log(formJson);

        for (var key in formJson) {
            if (formJson.hasOwnProperty(key)) {
                if (key == "items") {
                    console.log("items");
                    for (i = 0, j = 0; i < formJson.items.length; i++) {
                        if (!(formJson.items[i] === undefined)) {
                            requestText += "<input type=\"hidden\" name=\"items[" + j + "][product_code]\" value=\"" + formJson.items[i].pc + "\">\n";
                            requestText += "<input type=\"hidden\" name=\"items[" + j + "][description]\" value=\"" + formJson.items[i].desc + "\">\n";
                            requestText += "<input type=\"hidden\" name=\"items[" + j + "][qty]\" value=\"" + formJson.items[i].qty + "\">\n";
                            requestText += "<input type=\"hidden\" name=\"items[" + j + "][total]\" value=\"" + formJson.items[i].total + "\">\n";
                            j++;
                        }
                    }
                } else {
                    requestText += "<input type=\"hidden\" name=\"" + key + "\" value=\"" + formJson[key] + "\">\n";
                }
            }
        }
        requestText += "</form>";

        console.log(requestText);

        editor.setValue(requestText);
        //requestForm.innerText = requestText;
        console.log("done!");
    };

});


app.controller('requestCtrl', function ($scope, $http) {

    var requestEditor = ace.edit("requestForm");
    var responseEditor = ace.edit("ResponseForm");
    responseEditor.setTheme("ace/theme/chrome");
    responseEditor.session.setMode("ace/mode/html");
    responseEditor.setFontSize(11);
    responseEditor.setReadOnly(true);

    console.log("requestCtrl");
    $scope.validate = function () {
        var responseForm = document.getElementById("requestForm");
        //var respFormVal = responseForm.innerText;

        var respFormVal = requestEditor.getValue();

        parser = new DOMParser();
        xmlDoc = parser.parseFromString(respFormVal, "text/xml");

        var inputList = xmlDoc.getElementsByTagName("input");
        createJSONObj(inputList);
        populateTable("RequestParams");
    }

    $scope.getResponse = function () {

        var hReference;
        var hAmount;
        var hCurrency;
        var hReturnPath;
        var hmacMsg;

        for (var key in paramList) {
            if (paramList.hasOwnProperty(key)) {
                console.log("key: " + key);
                console.log("paramList[key]: " + paramList[key]);
                if (key == "reference") {
                    hReference = paramList[key]
                }
                if (key == "amount") {
                    hAmount = paramList[key]
                }
                if (key == "currency") {
                    hCurrency = paramList[key]
                }
                if (key == "return_path") {
                    hReturnPath = paramList[key]
                }
                //formData.append(key, paramList[key]);
            }
        }

        var hmacMsg = hReference + ":" + hAmount + ":" + hCurrency + ":" + hReturnPath;
        console.log("hmac message : " + hmacMsg);

        var secretString = "78a9712f";

        var hmacMsg = hReference + ":" + hAmount + ":" + hCurrency + ":" + hReturnPath;
        console.log("hmac message : " + hmacMsg);

        var digest = getHMAC(hmacMsg, secretString);
        console.log("digest : " + digest);

        paramList.verification = digest;

        console.log(paramList);

        $http({
            method: 'POST',
            url: 'https://gateway-sandbox.ipsi.com.au/v2/purchases/direct/lfs-000407223',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            transformRequest: function (obj) {
                var str = [];
                for (var p in obj)
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: paramList
        }).then(function (response) {
            if (response.status == 200) {
                console.log("response.status : " + response.status);
                var responseText = response.data;
                console.log(responseText);

                var dummyDOM = document.createElement('html');
                dummyDOM.innerHTML = responseText;
                var removeTags = dummyDOM.getElementsByTagName("head");

                if (!(removeTags[0] == undefined)) {
                    removeTags[0].parentNode.removeChild(removeTags[0]);
                }
                removeTags = dummyDOM.getElementsByTagName("script");
                if (!(removeTags[0] == undefined)) {
                    removeTags[0].parentNode.removeChild(removeTags[0]);
                }
                responseEditor.setValue(dummyDOM.innerHTML);

                var inputList = dummyDOM.getElementsByTagName("input");


                createJSONObj(inputList);
                populateTable("ResponseParams");
            } else {
                console.log("Error in response");
                console.log(response);
            }
        });
    };
});


app.controller('ResponseCtrl', function ($scope) {

    console.log("ResponseCtrl");
    $scope.validate = function () {

    }


});

function createJSONObj(inputList) {
    console.log("createJSONObj");
    var i;
    paramList = {};
    for (i = 0; i < inputList.length; i++) {
        paramList[inputList[i].getAttribute('name')] = inputList[i].getAttribute('value');
    }
    console.log(paramList);
    return paramList;
}

function populateTable(TableId) {
    console.log("populateTable");
    var i;
    var table = document.getElementById(TableId);
    var trLength = table.rows.length;

    for (i = 1; i < trLength; i++) {
        table.deleteRow(1);
    }

    i = 1;
    for (var key in paramList) {
        if (paramList.hasOwnProperty(key)) {
            var row = table.insertRow(i++);
            var keyCell = row.insertCell(0);
            var valueCell = row.insertCell(1);
            keyCell.innerHTML = key;
            valueCell.innerHTML = paramList[key];
        }
    }
    console.log("Table populated");
}


function getHMAC(hmacMsg, secretString) {
    console.log(hmacMsg);
    console.log(secretString);
    var hash = CryptoJS.HmacMD5(hmacMsg, secretString);
    return hash.toString();
}