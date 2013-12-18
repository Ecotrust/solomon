
angular.module('askApp').controller('ReportCtrl', function($scope, $http, $routeParams) {
    function fish_weight_by_market(charts, start_date, end_date, slug) {
        var url = ['/reports/crosstab', slug, 'survey-site', 'total-weight'].join('/');
            url = url + '?startdate=' + start_date;
            url = url + '&enddate=' + end_date;

        return $http.get(url).success(function(data) {
            charts.push({
                title: "Total Fish Weight by Market",
                type: data.type,
                labels: _.pluck(data.crosstab, 'name'),
                data: _.pluck(data.crosstab, 'value'),
                download_url: url.replace("total-weight", "total-weight" + '.csv'),
                xLabel: 'Market',
                yLabel: 'Total Weight (kg)',
                order: 2,
                message: data.message,
                unit: 'kg'
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function fish_weight_by_province(charts, start_date, end_date, slug) {
        var url = ['/reports/crosstab', slug, 'province-purchased-caught', 'total-weight'].join('/');
            url = url + '?startdate=' + start_date;
            url = url + '&enddate=' + end_date;

        return $http.get(url).success(function(data) {
            charts.push({
                title: "Total Fish Weight by Province",
                type: data.type,
                labels: _.pluck(data.crosstab, 'name'),
                data: _.pluck(data.crosstab, 'value'),
                download_url: url.replace("total-weight", "total-weight" + '.csv'),
                xLabel: 'Province',
                yLabel: 'Total Weight (kg)',
                order: 3,
                message: data.message,
                unit: 'kg'
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function average_trip_costs_by_market(charts, start_date, end_date, slug) {
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
                download_url: url.replace("cost", "cost" + '.csv'),
                xLabel: 'Market',
                yLabel: 'Average Trip Costs',
                order: 1,
                message: data.message
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function total_weight_for_market(charts, start_date, end_date, slug) {
        var url = ['/reports/crosstab', slug, 'survey-site', 'total-weight'].join('/');
        url = url + '?startdate=' + start_date;
        url = url + '&enddate=' + end_date;
        url = url + '&group=week';

        return $http.get(url).success(function(data) {
            var sdate = new Date($scope.filter.startDate);
            var edate = new Date($scope.filter.endDate);

            var filtered = _.map(data.crosstab, function(answer) {
                answer.value = _.filter(answer.value, function(x) {
                    var d = $scope.dateFromISO(x.date);
                    return (d >= sdate && d <= edate);
                });
                return answer;
            });

            charts.push({
                title: "Total Weight for Week by Market",
                labels: _.pluck(filtered, 'name'),
                seriesNames: data.seriesNames,
                type: data.type,
                data: filtered,
                unit: 'kg',
                download_url: url.replace("total-weight", "total-weight" + '.csv'),
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

    function filters_changed(surveySlug) {
        $scope.charts = [];
        $scope.getRespondents();

        var start_date = new Date($scope.filter.startDate).toString('yyyyMMdd');
        var end_date = new Date($scope.filter.endDate).toString('yyyyMMdd');

        // FIXME: Actually pull these charts from the DB or something.
        if ($scope.activePage == 'economic') {
            $scope.subtitle = "Socio-Economic Information"
            average_trip_costs_by_market($scope.charts, start_date, end_date,
                surveySlug);
        } else if ($scope.activePage == 'biological') {
            $scope.subtitle = "Biologic Information"
            fish_weight_by_province($scope.charts, start_date, end_date,
                surveySlug);
            fish_weight_by_market($scope.charts, start_date, end_date,
                surveySlug)
            total_weight_for_market($scope.charts, start_date, end_date,
                surveySlug);
        }
    }
    $scope.filter = null;
    $scope.charts = [];
    $scope.viewPath = app.viewPath;
    $scope.surveyorTimeFilter = 'week';
    $scope.activePage = $routeParams.reportName.toLowerCase();

    $http.get('/api/v1/surveyreport/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
        data.questions.reverse();
        $scope.survey = data;
        var start_date = $scope.dateFromISO($scope.survey.response_date_start);
        var end_date = $scope.dateFromISO($scope.survey.response_date_end);
        $scope.filter = {
            startDate: start_date.valueOf(),
            endDate: end_date.valueOf()
        }
    });

    $scope.getRespondents = function (url) {
        $scope.respondentsLoading = true;
        if (! url) {
            url = '/api/v1/reportrespondant/?format=json&limit=10&survey__slug__exact=' + $routeParams.surveySlug;
        }
        if ($scope.filter.startDate && url.indexOf("&ts__gte=") == -1) {
            url = url + '&ts__gte=' + new Date($scope.filter.startDate).add(-1).day().toString('yyyy-MM-dd');
        }
        if ($scope.filter.endDate && url.indexOf("&ts__lte=") == -1) {
            url = url + '&ts__lte=' + new Date($scope.filter.endDate).add(2).day().toString('yyyy-MM-dd');
        }

        $http.get(url).success(function(data) {
            $scope.respondentsLoading = false;
            $scope.respondents = data.objects;
            $scope.meta = data.meta;
        });
    }

    $scope.$watch('filter', function (newValue) {
        if (newValue) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);

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
