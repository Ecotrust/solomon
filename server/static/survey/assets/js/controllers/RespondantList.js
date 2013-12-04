//'use strict';

function fish_weight_by_market($http, charts, start_date, end_date, slug) {
    var url = ['/reports/crosstab', slug, 'survey-site', 'total-weight'].join('/');
        url = url + '?startdate=' + start_date;
        url = url + '&enddate=' + end_date;

    return $http.get(url).success(function(data) {
        charts.push({
            title: "Total Fish Weight by Market",
            type: data.type,
            labels: _.pluck(data.crosstab, 'name'),
            data: _.pluck(data.crosstab, 'value'),
            xLabel: 'Market',
            yLabel: 'Total Weight (kg)',
            order: 2,
            message: data.message
        });
        charts.sort(function (a,b) { return a-b;})
    });
}

function fish_weight_by_province($http, charts, start_date, end_date, slug) {
    var url = ['/reports/crosstab', slug, 'province-purchased-caught', 'total-weight'].join('/');
        url = url + '?startdate=' + start_date;
        url = url + '&enddate=' + end_date;

    return $http.get(url).success(function(data) {
        charts.push({
            title: "Total Fish Weight by Province",
            type: data.type,
            labels: _.pluck(data.crosstab, 'name'),
            data: _.pluck(data.crosstab, 'value'),
            xLabel: 'Province',
            yLabel: 'Total Weight (kg)',
            order: 3,
            message: data.message
        });
        charts.sort(function (a,b) { return a-b;})
    });
}

function average_trip_costs_by_market($http, charts, start_date, end_date, slug) {
    var url = ['/reports/crosstab', slug, 'survey-site', 'cost'].join('/');
        url = url + '?startdate=' + start_date;
        url = url + '&enddate=' + end_date;

    return $http.get(url).success(function(data) {
        charts.push({
            title: "Average Trip Costs by Market",
            labels: _.pluck(data.crosstab, 'name'),
            seriesNames: data.seriesNames,
            type: data.type,
            data: data.crosstab,
            xLabel: 'Market',
            yLabel: 'Average Trip Costs',
            order: 1,
            message: data.message
        });
        charts.sort(function (a,b) { return a-b;})
    });
}

function total_weight_for_market($http, charts, start_date, end_date, slug) {
    var url = ['/reports/crosstab', slug, 'survey-site', 'total-weight'].join('/');
    url = url + '?startdate=' + start_date;
    url = url + '&enddate=' + end_date;
    url = url + '&group=week';

    return $http.get(url).success(function(data) {
        charts.push({
            title: "Total Weight for Week by Market",
            labels: _.pluck(data.crosstab, 'name'),
            seriesNames: data.seriesNames,
            type: data.type,
            data: data.crosstab,
            xLabel: 'Market',
            yLabel: 'Total Weight (kg)',
            order: 4,
            startDate: start_date,
            endDate: end_date,
            message: data.message
        });
        charts.sort(function (a,b) { return a-b;})
    });
}

function setup_market_dropdown($http, $scope) {
    var market_site_id = _.find($scope.survey.questions, function(x) {
        return x.slug == 'survey-site';
    }).id;
    var url = '/api/v1/response?format=json&question=' + market_site_id;

    $http.get(url).success(function(data) {
        $scope.markets = [];
        $scope.market = "";
        var markets_with_dupes = _.map(data.objects,
            function(x) { return x.answer; });

        _.each(markets_with_dupes, function (x) {
            if (_.indexOf($scope.markets, x) === -1) {
                $scope.markets.push(x);
            }
        });
    });
}

function filters_changed($http, $scope, surveySlug) {
    $scope.charts = [];
    $scope.getRespondents();

    var start_date = new Date($scope.filter.startDate).toString('yyyyMMdd');
    var end_date = new Date($scope.filter.endDate).toString('yyyyMMdd');

    fish_weight_by_market($http, $scope.charts, start_date, end_date,
        surveySlug)

    fish_weight_by_province($http, $scope.charts, start_date, end_date,
        surveySlug);

    average_trip_costs_by_market($http, $scope.charts, start_date, end_date,
        surveySlug);

    total_weight_for_market($http, $scope.charts, start_date, end_date,
        surveySlug);

    // FIXME: When the survey data can be pulled in, put it here.
    $scope.surveyor_by_time = {
        yLabel: "Survey Responses"
    }
}

angular.module('askApp')
    .controller('RespondantListCtrl', function($scope, $http, $routeParams) {

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
            filters_changed($http, $scope, $routeParams.surveySlug);
        }
    }, true);

    $scope.$watch('status_single', function (newValue) {
        if ($scope.filter) {
            filters_changed($http, $scope, $routeParams.surveySlug);
        }
    }, true);

    $scope.$watch('market', function (newValue) {
        if ($scope.filter) {
            filters_changed($http, $scope, $routeParams.surveySlug);
        }
    }, true);

    $http.get('/api/v1/surveyreport/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
        data.questions.reverse();
        $scope.survey = data;
        setup_market_dropdown($http, $scope);
        $scope.filter = {
            startDate: $scope.dateFromISO($scope.survey.response_date_start).add(-1).day().valueOf(),
            endDate: $scope.dateFromISO($scope.survey.response_date_end).add(1).day().valueOf()
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
            url = url + '&status=' + $scope.status_single;
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
