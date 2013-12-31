//'use strict';

angular.module('askApp')
  .controller('CompleteCtrl', function ($scope, $routeParams, $http) {
    try {
        var url = '/respond/complete/' + [$routeParams.surveySlug, $routeParams.uuidSlug].join('/');

        if (app.user) {
            $scope.user = app.user;
        } else {
            $scope.user = false;
        }
        $scope.path = false;

        if ($routeParams.action === 'terminate' && $routeParams.questionSlug) {
            url = [url, 'terminate', $routeParams.questionSlug].join('/');
        }

        if (app.surveys) {
            $scope.surveys = app.surveys;
        }
        $scope.survey = _.findWhere($scope.surveys, { slug: $routeParams.surveySlug});

        $scope.sendRespondent = function (respondent) {
            var url = app.server + _.string.sprintf('/api/v1/offlinerespondant/?username=%s&api_key=%s',
                    app.user.username, app.user.api_key);
                newResponses = angular.copy(respondent.responses);
            _.each(newResponses, function (response) {
                var question_uri = response.question.resource_uri;
                response.question = question_uri;
                response.answer_raw = JSON.stringify(response.answer);
            });
            var newRespondent = {
                ts: new Date(respondent.ts),
                uuid: respondent.uuid.replace(':', '_'),
                responses: newResponses,
                status: respondent.status,
                complete: respondent.complete,
                survey: '/api/v1/survey/' + respondent.survey + '/'
            };
            return $http.post(url, newRespondent).error(function (err) {
                console.log(JSON.stringify(err));
            });
            
        }   

        
        if (app.offline) {
 
            $scope.respondent = JSON.parse(localStorage.getItem(app.currentRespondantKey));
            $scope.respondent.complete = true;
            if ($routeParams.uuidSlug === 'online') {
                $scope.sendRespondent($scope.respondent);
            } else {
                localStorage.setItem(app.currentRespondantKey, JSON.stringify($scope.respondent));    
            }
        } else {
            $http.post(url).success(function (data) {
                app.data.state = $routeParams.action;
            });    
        }
        
        
        if (app.data) {
            $scope.responses =app.data.responses;    
            app.data.responses = [];
        }
        $scope.completeView = '/static/survey/survey-pages/' + $routeParams.surveySlug + '/complete.html';    
    }
    catch(e){
    }
    
  });
