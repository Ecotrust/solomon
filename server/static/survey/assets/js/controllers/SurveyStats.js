//'use strict';

angular.module('askApp')
    .controller('SurveyStatsCtrl', function($scope, $http, $routeParams, $location) {

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

        var start_date = new Date($scope.filter.startDate).toString('yyyy-MM-dd');
        var end_date = new Date($scope.filter.endDate).toString('yyyy-MM-dd');
        var url = '/report/surveyor-stats/' + $routeParams.surveySlug + '/' + $scope.surveyorTimeFilter;
        url += '?start_date=' + start_date;
        url += '&end_date=' + end_date;

        if ($scope.market) {
            url += '&market=' + $scope.market;
        }

        if ($scope.status_single) {
            url += '&status=' + $scope.status_single;
        }

        $http.get(url).success(function(data) {
            $scope.surveyor_by_time = {
                yLabel: "Survey Responses",
                raw_data: data.graph_data,
                download_url: url.replace($scope.surveyorTimeFilter, $scope.surveyorTimeFilter + '.csv'),
                unit: "surveys"
            }
            // map reduuuuuuce
            var bar_data = _.map(data.graph_data,
                function (x) {
                    return _.reduce(x.data, function (attr, val) { return attr + val[1]; }, 0);
                }
            );
            $scope.surveyor_total = {
                labels: _.pluck(data.graph_data, 'name'),
                yLabel: "Surveys Collected",
                data: bar_data,
                download_url: url.replace($scope.surveyorTimeFilter, $scope.surveyorTimeFilter + '.csv'),
                unit: "surveys"
            }
        });
    }

    function setup_columns() {
        $scope.columns = [ { name: 'Surveyor', field: 'user' }
                         , { name: 'Date', field: 'ts' }
                         , { name: 'Time', field: 'ts' }
                         , { name: 'Market', field: 'survey_site' }
                         , { name: 'Vendor Name', field: 'vendor' }
                         , { name: 'Buyer/Fisher', field: 'buy_or_catch' }
                         , { name: 'Sales Type', field: 'how_sold' }
                         , { name: 'Status', field: 'review_status' }
                         //, { name: 'Detail', field: 'responses' }
                         ];
        var order_by = $location.search().order_by;

        if (order_by) {
            $scope.sortDescending = order_by[0] == "-";
            $scope.currentColumn = $scope.sortDescending ?
                _.find($scope.columns, function (x) { return "-" + x.field == order_by; }) || $scope.columns[1] :
                _.find($scope.columns, function (x) { return x.field == order_by; }) || $scope.columns[1];
        } else {
            $scope.sortDescending = true;
            $scope.currentColumn = $scope.columns[1];
        }

        $scope.changeSorting = function (column) {
            if ($scope.currentColumn == column) {
                $scope.sortDescending = !$scope.sortDescending;
                $scope.getRespondents();
            } else {
                $scope.currentColumn = column;
                $scope.sortDescending = true;
                $scope.getRespondents();
            }
        };
    }

    $scope.goToResponse = function(respondent) {
        window.location = "#/RespondantDetail/" + $scope.survey.slug +
            "/" + respondent.uuid + "?" + $scope.filtered_list_url;
    }
    $scope.market = $location.search().market || "";
    $scope.filter = null;
    $scope.viewPath = app.viewPath;
    $scope.surveyorTimeFilter = 'week';
    $scope.activePage = 'survey-stats';
    $scope.statuses = [];
    $scope.status_single = $location.search().status || "";
    setup_columns();

    $scope.$watch('filter', function (newValue) {
        if (newValue) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);

    $scope.$watch('status_single', function (newValue) {
        if ($scope.filter) {
            filters_changed($routeParams.surveySlug);
        }
    }, false);

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
        var start_date = $location.search().ts__gte ?
            new Date(parseInt($location.search().ts__gte)) :
            $scope.dateFromISO($scope.survey.response_date_start);
        var end_date = $location.search().ts__lte ?
            new Date(parseInt($location.search().ts__lte)) :
            $scope.dateFromISO($scope.survey.response_date_end);
        $scope.filter = {
            min: $scope.dateFromISO($scope.survey.response_date_start).add(-1).day().valueOf(),
            max: $scope.dateFromISO($scope.survey.response_date_end).add(2).day().valueOf(),
            startDate: start_date.add(-1).day().valueOf(),
            endDate: end_date.add(2).day().valueOf()
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

        var location_obj = {};
        if ($scope.filter.startDate && url.indexOf("&ts__gte=") == -1) {
            var str = new Date($scope.filter.startDate).toString('yyyy-MM-dd');
            location_obj.ts__gte = new Date($scope.filter.startDate).valueOf();
            url = url + '&ts__gte=' + str;
        }
        if ($scope.filter.endDate && url.indexOf("&ts__lte=") == -1) {
            var str = new Date($scope.filter.endDate).toString('yyyy-MM-dd');
            location_obj.ts__lte = new Date($scope.filter.endDate).valueOf();
            url = url + '&ts__lte=' + str;
        }
        if ($scope.market && url.indexOf("&survey_site=") == -1) {
            location_obj.survey_site = $scope.market;
            url = url + '&survey_site=' + $scope.market;
        }
        if ($scope.status_single && url.indexOf("&status=") == -1) {
            location_obj.status = $scope.status_single;
            url = url + '&review_status=' + $scope.status_single;
        }
        if ($scope.currentColumn && url.indexOf("&order_by=") == -1) {
            var str = $scope.sortDescending ? "-" + $scope.currentColumn.field : $scope.currentColumn.field;
            location_obj.order_by = str;
            url = url + '&order_by=' + str;
        }
        $location.search(location_obj);
        // hue hue hue:
        $scope.filtered_list_url = "filtered_list_url=" + btoa("#/RespondantList/" + $scope.survey.slug + "?" +
            _.map(_.keys(location_obj), function(x) { return x + "=" + location_obj[x]; }).join("&"));

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
