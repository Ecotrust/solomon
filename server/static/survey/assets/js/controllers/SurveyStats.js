angular.module('askApp')
    .controller('SurveyStatsCtrl', function($scope, $http, $routeParams, $location, reportsCommon, surveyShared) {

    function total_surveys_by_province() {
        var start_date = new Date($scope.filter.startDate).toString('yyyy-MM-dd');
        var end_date = new Date($scope.filter.endDate).add(1).day().toString('yyyy-MM-dd');
        var url = "/reports/single-select-count/survey-province";
        url += '?start_date=' + start_date;
        url += '&end_date=' + end_date;

        if ($scope.market) {
            url += '&market=' + $scope.market;
        }

        if ($scope.status_single) {
            url += '&status=' + $scope.status_single;
        }

        $http.get(url).success(function(data) {
            $scope.surveys_by_province = {
                labels: _.pluck(data.graph_data, "answer"),
                displayTitle: false,
                yLabel: "",
                title: "Surveys by Province",
                categories: [""],
                type: "bar",
                data: _.pluck(data.graph_data, "count"),
                download_url: url.replace("survey-province", "survey-province.csv"),
                unit: "surveys"
            }
        });
    }

    function total_surveys_by_market() {
        var start_date = new Date($scope.filter.startDate).toString('yyyy-MM-dd');
        var end_date = new Date($scope.filter.endDate).add(1).day().toString('yyyy-MM-dd');
        var url = "/reports/single-select-count/survey-site";
        url += '?start_date=' + start_date;
        url += '&end_date=' + end_date;

        if ($scope.market) {
            url += '&market=' + $scope.market;
        }

        if ($scope.status_single) {
            url += '&status=' + $scope.status_single;
        }

        $http.get(url).success(function(data) {
            $scope.surveys_by_market = {
                labels: _.pluck(data.graph_data, "answer"),
                displayTitle: false,
                yLabel: "",
                title: "Surveys by Market",
                categories: [""],
                type: "bar",
                data: _.pluck(data.graph_data, "count"),
                download_url: url.replace("survey-site", "survey-site.csv"),
                unit: "surveys"
            }
        });
    }

    function build_survey_totals() {
        var url = reportsCommon.build_survey_stats_url($scope);

        $http.get(url).success(function(data) {
            $scope.surveyor_by_time = {
                yLabel: "Surveys Collected",
                title: "Surveys Collected by Date",
                displayTitle: false,
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
                displayTitle: false,
                yLabel: "Surveys Collected",
                title: "Total Surveys Collected by Surveyor",
                categories: [""],
                type: "bar",
                data: bar_data,
                download_url: url.replace($scope.surveyorTimeFilter, $scope.surveyorTimeFilter + ".csv"),
                unit: "surveys"
            }
        });
    }

    function filters_changed(surveySlug) {
        reportsCommon.getRespondents(null, $scope);
        build_survey_totals();
        total_surveys_by_province();
        total_surveys_by_market();
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
            } else {
                $scope.currentColumn = column;
                $scope.sortDescending = true;
            }
            reportsCommon.getRespondents(null, $scope);
        };
    }

    $scope.goToResponse = function(respondent) {
        window.location = "#/RespondantDetail/" + $scope.survey.slug +
            "/" + respondent.uuid + "?" + $scope.filtered_list_url;
    }
    $scope.market = $location.search().survey_site || null;
    $scope.filter = null;
    $scope.viewPath = app.viewPath;
    $scope.surveyorTimeFilter = 'week';
    $scope.activePage = 'survey-stats';
    $scope.statuses = [];
    $scope.status_single = $location.search().status || null;
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

    surveyShared.getSurvey(function(data) {
        data.questions.reverse();
        $scope.survey = data;
        reportsCommon.setup_market_dropdown($scope);
        var start_date = $location.search().ts__gte ?
            new Date(parseInt($location.search().ts__gte)) :
            reportsCommon.dateFromISO($scope.survey.response_date_start);
        var end_date = $location.search().ts__lte ?
            new Date(parseInt($location.search().ts__lte)) :
            reportsCommon.dateFromISO($scope.survey.response_date_end);
        $scope.filter = {
            min: reportsCommon.dateFromISO($scope.survey.response_date_start).valueOf(),
            max: reportsCommon.dateFromISO($scope.survey.response_date_end).valueOf(),
            startDate: start_date.valueOf(),
            endDate: end_date.valueOf()
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

    $scope.getQuestionByUri = function (uri) {
        return _.findWhere($scope.survey.questions, {'resource_uri': uri});
    };

    $scope.getQuestionBySlug = function (slug) {
        return _.findWhere($scope.survey.questions, {'slug': slug});
    };
});
