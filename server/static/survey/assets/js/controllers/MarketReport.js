angular.module('askApp')
    .controller('MarketReportCtrl', function($scope, $http, $routeParams, $location, reportsCommon, surveyShared) {

    function total_weight_for_market(slug) {
        var sdate = new Date($scope.filter.startDate);
        var edate = new Date($scope.filter.endDate);

        var url = ['/reports/crosstab', slug, 'survey-site', 'total-weight'].join('/');
        url = url + '?startdate=' + sdate.toString("yyyyMMdd");
        url = url + '&enddate=' + edate.toString("yyyyMMdd");
        url = url + '&group=week';

        if ($scope.market) {
            url = url + '&market=' + $scope.market;
        }
        if ($scope.status_single) {
            url += '&status=' + $scope.status_single;
        }

        return $http.get(url).success(function(data) {
            var filtered_answers = _.map(data.crosstab, function(answer) {
                answer.value = _.filter(answer.value, function(x) {
                    var d = reportsCommon.dateFromISO(x.date);
                    return (d >= sdate && d <= edate);
                });
                return answer;
            });

            filtered_answers = _.filter(data.crosstab, function(answer) {
                return (!$scope.market || $scope.market == answer.name);
            });
            $scope.total_market_weight = _.reduce(filtered_answers, function(accum, val) {
                return accum + _.reduce(val.value, function(x,y) { return x + parseInt(y.sum); }, 0);
            }, 0);
        });
    }

    function resource_frequency(charts, start_date, end_date, slug) {
        var url = "/reports/vendor-resource-frequency/";
        url = url + '?start_date=' + start_date;
        url = url + '&end_date=' + end_date;

        if ($scope.market) {
            url = url + '&market=' + $scope.market;
        }
        if ($scope.status_single) {
            url += '&status=' + $scope.status_single;
        }

        return $http.get(url).success(function(data) {
            $scope.resource_frequency = {
                labels: _.pluck(data.graph_data, 'answer_text'),
                xLabel: 'Fish Family',
                title: "Frequency of Fish Family When Sold By Piece/Heap",
                categories: [""],
                type: "bar",
                unit: '%',
                formatter: function() {
                    return '<b>' + this.series.name + '</b>' + ': ' + this.y + "%";
                },
                dataLabels: function () { return this.y + "%"; },
                data: _.map(data.graph_data, function(x) { return parseInt(parseFloat(x.percent) * 100); }),
                download_url: url.replace('vendor-resource-frequency', 'vendor-resource-frequency.csv'),
                yLabel: 'Percentage of Occurrence'
            }
        });
    }
    function average_for_resource(charts, start_date, end_date, slug) {
        var url = "/reports/grid-standard-deviation/price-per-pound/" + $scope.surveyorTimeFilter
            url = url + '?start_date=' + start_date;
            url = url + '&end_date=' + end_date;
            url = url + '&col=Day1';
        if ($scope.market) {
            url = url + '&market=' + $scope.market;
        }
        if ($scope.status_single) {
            url += '&status=' + $scope.status_single;
        }
        var fish_name_whitelist = ["Common Reef Fish", "Coral grouper/Coral trout",
            "Deepwater Snapper", "Humphead/Napoleon Wrasse", "Kingfish",
            "Ratfish", "Spanish Mackerel", "Topa",
            "Mollusc/squid/octopus/lobster"];

        return $http.get(url).success(function(data) {
            var to_graph = {};
            _.each(_.keys(data.graph_data), function(item) {
                to_graph[item] = {
                    name: item,
                    data: _.map(data.graph_data[item], function(x) {
                        return [parseInt(x.date), parseFloat(x.average)];
                    })
                }
            });
            to_graph = _.filter(to_graph, function(x) {
                return fish_name_whitelist.indexOf(x.name) != -1;
            });
            $scope.average_for_resource = {
                title: "Average Price for Resource",
                labels: _.keys(to_graph),
                seriesNames: _.keys(to_graph),
                type: "time-series",
                download_url: url.replace($scope.surveyorTimeFilter, $scope.surveyorTimeFilter + '.csv'),
                tooltipFormatter: function() {
                    return '<b>' + this.series.name + '</b>' + ': $' + parseFloat(this.y).toFixed(2);
                },
                raw_data: _.values(to_graph),
                xLabel: 'Date',
                yLabel: 'Price',
                order: 1,
                message: data.message
            }
        });
    }
    function filters_changed(surveySlug) {
        reportsCommon.getRespondents(null, $scope);
        var url = reportsCommon.build_survey_stats_url($scope);

        var start_date = new Date($scope.filter.startDate).toString('yyyyMMdd');
        var end_date = new Date($scope.filter.endDate).toString('yyyyMMdd');

        total_weight_for_market(surveySlug);
        average_for_resource($scope.charts,
            new Date($scope.filter.startDate).toString('yyyy-MM-dd'),
            new Date($scope.filter.endDate).toString('yyyy-MM-dd'),
            $routeParams.surveySlug);
        resource_frequency($scope.charts,
            new Date($scope.filter.startDate).toString('yyyy-MM-dd'),
            new Date($scope.filter.endDate).toString('yyyy-MM-dd'),
            $routeParams.surveySlug);

        $http.get(url).success(function(data) {
            $scope.surveyor_by_time = {
                yLabel: "Surveys Collected",
                title: "Surveys Collected by Date",
                raw_data: data.graph_data,
                download_url: url.replace($scope.surveyorTimeFilter, $scope.surveyorTimeFilter + '.csv'),
                unit: "surveys"
            }
        });
    }

    $scope.goToResponse = function(respondent) {
        window.location = "#/RespondantDetail/" + $scope.survey.slug +
            "/" + respondent.uuid + "?" + $scope.filtered_list_url;
    }
    $scope.market = $location.search().survey_site || null;
    $scope.filter = null;
    $scope.viewPath = app.viewPath;
    $scope.surveyorTimeFilter = 'week';
    $scope.activePage = 'market-report';
    $scope.statuses = [];
    $scope.status_single = $location.search().status || null;

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

    $scope.getRespondents = function(url) {
        return reportsCommon.getRespondents(url, $scope);
    }

    $scope.getQuestionByUri = function (uri) {
        return _.findWhere($scope.survey.questions, {'resource_uri': uri});
    };

    $scope.getQuestionBySlug = function (slug) {
        return _.findWhere($scope.survey.questions, {'slug': slug});
    };
});
