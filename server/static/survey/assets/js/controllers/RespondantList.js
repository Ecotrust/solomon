//'use strict';

angular.module('askApp')
    .controller('RespondantListCtrl', function($scope, $http, $routeParams) {

    function setup_market_dropdown() {
        var market_site_id = _.find($scope.survey.questions, function(x) {
            return x.slug == 'survey-site';
        }).id;
        var url = '/api/v1/response?format=json&question=' + market_site_id;

        $http.get(url).success(function(data) {
            $scope.markets = [];
            var markets_with_dupes = _.map(data.objects,
                function(x) { return x.answer; });

            _.each(markets_with_dupes, function (x) {
                if (_.indexOf($scope.markets, x) === -1) {
                    $scope.markets.push(x);
                }
            });
        });
    }

    function filters_changed(surveySlug) {
        $scope.getRespondents();

        var start_date = new Date($scope.filter.startDate).toString('yyyyMMdd');
        var end_date = new Date($scope.filter.endDate).toString('yyyyMMdd');
        var url = '/report/surveyor-stats/' + $routeParams.surveySlug + '/' + $scope.surveyorTimeFilter;
        url += '?startdate=' + start_date;
        url += '&enddate=' + end_date;

        if ($scope.market) {
            url += '&market=' + $scope.market;
        }

        if ($scope.status_single) {
            url += '&status=' + $scope.status_single[0];
        }

        $http.get(url).success(function(data) {
            $scope.surveyor_by_time = {
                yLabel: "Survey Responses",
                raw_data: data.graph_data,
                unit: "surveys"
            }
        });
    }


    $scope.market = "";
    $scope.filter = null;
    $scope.viewPath = app.viewPath;
    $scope.surveyorTimeFilter = 'week';
    $scope.activePage = 'overview';
    $scope.statuses = [];
    $scope.status_single = "";

    $scope.columns = [ 'Surveyor'
                     , 'Date'
                     , 'Time'
                     , 'Market'
                     , 'Vendor Name'
                     , 'Buyer/Fisher'
                     , 'Sales Type'
                     , 'Status'
                     , 'Detail'
                     ];
    $scope.currentColumn = 'Date';
    $scope.sortDescending = true;
    $scope.changeSorting = function (column) {
        if ($scope.currentColumn == column) {
            $scope.sortDescending = !$scope.sortDescending;
        } else {
            $scope.currentColumn = column;
            $scope.sortDescending = true;
        }
    };

    $scope.$watch('filter', function (newValue) {
        if (newValue) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);

    $scope.$watch('status_single', function (newValue) {
        if ($scope.filter) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);

    $scope.$watch('market', function (newValue) {
        if ($scope.filter) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);

    $scope.$watch('surveyorTimeFilter', function (newValue) {
        if ($scope.filter) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);

    $http.get('/api/v1/surveyreport/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
        data.questions.reverse();
        $scope.survey = data;
        setup_market_dropdown();
        $scope.filter = {
            startDate: $scope.dateFromISO($scope.survey.response_date_start).add(-1).day().valueOf(),
            endDate: $scope.dateFromISO($scope.survey.response_date_end).add(2).day().valueOf()
        }

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
        if ($scope.market && url.indexOf("&survey_site=") == -1) {
            url = url + '&survey_site=' + $scope.market;
        }
        if ($scope.status_single && url.indexOf("&status=") == -1) {
            url = url + '&status=' + $scope.status_single[0];
        }

        $http.get(url).success(function(data) {
            $scope.respondentsLoading = false;
            $scope.respondents = data.objects;
            $scope.meta = data.meta;
            $scope.statuses = data.meta.statuses;
        });
    }

    $scope.getQuestionByUri = function (uri) {
        return _.findWhere($scope.survey.questions, {'resource_uri': uri});
    };

    $scope.getQuestionBySlug = function (slug) {
        return _.findWhere($scope.survey.questions, {'slug': slug});
    };

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
