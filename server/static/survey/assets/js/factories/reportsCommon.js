angular.module('askApp').factory('reportsCommon', function($http, $routeParams, $location) {
    var factory = {};

    factory.build_survey_stats_url = function($scope) {
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
        return url;
    }
    factory.setup_market_dropdown = function($scope) {
        var url = "/report/distribution/" + $routeParams.surveySlug + "/survey-site"

        $http.get(url).success(function(data) {
            $scope.markets = _.pluck(data.answer_domain, "answer");
        });
    }

    factory.getRespondents = function (url, $scope) {
        $scope.respondentsLoading = true;
        if (! url) {
            url = '/api/v1/reportrespondant/?format=json&limit=10&survey__slug__exact=' + $routeParams.surveySlug;
        }

        var location_obj = {};
        var start_date = $scope.filter.startDate;
        var end_date = $scope.filter.endDate;
        var status_single = $scope.status_single;
        var market = $scope.market;

        if (start_date && url.indexOf("&ts__gte=") == -1) {
            var str = new Date(start_date).toString('yyyy-MM-dd');
            location_obj.ts__gte = new Date(start_date).valueOf();
            url = url + '&ts__gte=' + str;
        }
        if (end_date && url.indexOf("&ts__lte=") == -1) {
            var str = new Date(end_date).add(2).day().toString('yyyy-MM-dd');
            location_obj.ts__lte = new Date(end_date).valueOf();
            url = url + '&ts__lte=' + str;
        }
        if (market && url.indexOf("&survey_site=") == -1) {
            location_obj.survey_site = market;
            url = url + '&survey_site=' + market;
        }
        if (status_single && url.indexOf("&status=") == -1) {
            location_obj.status = status_single;
            url = url + '&review_status=' + status_single;
        }
        if ($scope.currentColumn && url.indexOf("&order_by=") == -1) {
            var str = $scope.sortDescending ? "-" + $scope.currentColumn.field : $scope.currentColumn.field;
            location_obj.order_by = str;
            url = url + '&order_by=' + str;
        }
        $location.search(location_obj);
        // hue hue hue:
        var params = _.map(_.keys(location_obj), function(x) { return x + "=" + location_obj[x]; }).join("&");
        var b64_url = btoa("#/RespondantList/" + $scope.survey.slug + "?" + params);
        var encoded_url = escape(b64_url);
        $scope.filtered_list_url = "filtered_list_url=" + encoded_url;

        $http.get(url).success(function(data) {
            $scope.respondentsLoading = false;
            $scope.respondents = data.objects;
            $scope.meta = data.meta;
            $scope.statuses = data.meta.statuses;
        });
    }

    factory.dateFromISO = function (iso_str) {
        // IE8 and lower can't parse ISO strings into dates. See this
        // Stack Overflow question: http://stackoverflow.com/a/17593482
        if ($("html").is(".lt-ie9")) {
            var s = iso_str.split(/\D/);
            return new Date(Date.UTC(s[0], --s[1]||'', s[2]||'', s[3]||'', s[4]||'', s[5]||'', s[6]||''));
        }
        return new Date(iso_str);
    };

    return factory;
});
