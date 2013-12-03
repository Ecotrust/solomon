angular.module('askApp').controller('ReportCtrl', function($scope, $http, $routeParams) {

    $scope.viewPath = app.viewPath;
    $scope.surveyorTimeFilter = 'week';
    $scope.activePage = $routeParams.reportName.toLowerCase();

    $http.get('/api/v1/surveyreport/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
        data.questions.reverse();
        $scope.survey = data;
        setup_market_dropdown($http, $scope);
        $scope.filter = {
            startDate: $scope.dateFromISO($scope.survey.response_date_start).add(-1).day().valueOf(),
            endDate: $scope.dateFromISO($scope.survey.response_date_end).add(1).day().valueOf()
        }
        $scope.getRespondents();

        /*
        _.each($scope.survey.questions, function (question) {
            // save a reference to filter questions which are specified by uri
            question.filters = {};
            if (question.visualize && question.filter_questions) {
                question.filterQuestions = [];
                _.each(question.filter_questions, function (filterQuestion) {
                    question.filterQuestions.push($scope.getQuestionByUri(filterQuestion));
                });

            }
        });
        */
    });

    $scope.getRespondents = function (url) {
        $scope.respondentsLoading = true;
        if (! url) {
            url = '/api/v1/reportrespondant/?format=json&limit=10&survey__slug__exact=' + $routeParams.surveySlug;
        }
        if ($scope.filter.startDate && url.indexOf("&ts__gte=") == -1) {
            url = url + '&ts__gte=' + new Date($scope.filter.startDate).toString('yyyy-MM-dd');
        }
        if ($scope.filter.endDate && url.indexOf("&ts__lte=") == -1) {
            url = url + '&ts__lte=' + new Date($scope.filter.endDate).toString('yyyy-MM-dd');
        }

        $http.get(url).success(function(data) {
            $scope.respondentsLoading = false;
            $scope.respondents = data.objects;
            $scope.meta = data.meta;
        });
    }

    $scope.charts = [];

    $scope.dateFromISO = function (iso_str) {
        // IE8 and lower can't parse ISO strings into dates. See this
        // Stack Overflow question: http://stackoverflow.com/a/17593482
        if ($("html").is(".lt-ie9")) {
            var s = iso_str.split(/\D/);
            return new Date(Date.UTC(s[0], --s[1]||'', s[2]||'', s[3]||'', s[4]||'', s[5]||'', s[6]||''));
        }
        return new Date(iso_str);
    };
});
