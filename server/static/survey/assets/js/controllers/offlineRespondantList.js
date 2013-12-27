//'use strict';

angular.module('askApp')
    .controller('offlineRespondantListCtrl', function($scope, $http, $routeParams, $location) {
        $http.defaults.headers.post['Content-Type'] = 'application/json';

        $scope.saveState = function () {
            _.each($scope.respondentIndex, function (value, key) {
                localStorage.setItem('hapifish-'+ key, JSON.stringify(value));
            });
            localStorage.setItem('hapifish', JSON.stringify(app));
        }


        // $scope.saveState = function (state) {
        //     var appCopy = angular.copy(state);
        //     delete appCopy.currentRespondent;  
        //     localStorage.setItem('hapifish', JSON.stringify(appCopy));
        //     localStorage.setItem('hapifish-' + $routeParams.uuidSlug, JSON.stringify(state.currentRespondent));
        // };

        $scope.loadRespondents = function () {
            var respondents  = {};
            _.each(app.respondents, function (key, uuid) {
                respondents[uuid] = JSON.parse(localStorage.getItem(key));
            })
            
            return respondents;
        }
        // load the respondents and remove ghosts
        $scope.respondentIndex = $scope.loadRespondents();
        $scope.respondents = _.filter(_.toArray($scope.respondentIndex), function (respondent) {
            return respondent && respondent.responses.length > 0;
        });
        $scope.saveState();

        if (app.user) {
            $scope.user = app.user;    
        } else {
            $location.path('/');
        }

        $scope.path = $location.path().slice(1,5);

        


        if ($routeParams.uuidSlug) {
            $scope.respondent = $scope.respondentIndex[$routeParams.uuidSlug];
            $scope.survey = angular.copy(_.findWhere(app.surveys, { slug: $scope.respondent.survey}));
            $scope.responseIndex = _.indexBy($scope.respondent.responses, function (response) {
                return response.question.slug;
            });
            _.each($scope.survey.questions, function (question, index, questions) {
                var response = $scope.responseIndex[question.slug];
                if (question.grid_cols) {
                    _.each(question.grid_cols, function (grid_col) {
                        grid_col.label = grid_col.label.replace(/-/g, '');
                    });
                }

                // check for the start of new block
                if (question.blocks.length && ! _.isEqual(question.blocks, questions[index-1].blocks)) {
                    question.newBlocks = true;
                } else {
                    question.newBlocks = false;
                }

                // check for end of a blocks
                if (! questions[index-1] || question.blocks.length === 0 && questions[index-1].blocks.length > 0) {
                    question.noBlocks = true;
                }
                if (response) {
                    question.response = response.answer;    
                } 
            });

        }

        $scope.toggleComplete = function (respondent) {
            respondent.complete = ! respondent.complete;
            respondent.ts = new Date();
            $scope.saveState();
        }

        $scope.deleteRespondent = function (respondent) {
            var toBeDeleted = _.findWhere($scope.respondents,
                {uuid: respondent.uuid});
            $scope.respondents = _.without($scope.respondents, respondent);
            $scope.saveState();
            localStorage.removeItem('hapifish-' + respondent.uuid);
            $location.path('/respondents');
        }

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
                ts: respondent.ts,
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

        $scope.synchronized = [];
        $scope.busy = false;
        $scope.syncronize = function(respondents) {
            var completed = _.filter(respondents, function (respondent) { return respondent.complete });
            var first = _.first(completed),
                rest = _.rest(completed);
            $scope.confirmSubmit = false;
            if (completed.length) {
                $scope.busy = true;

                _.each(first.responses, function (response) {
                    if (response.question.grid_cols) {
                        _.each(response.question.grid_cols, function (grid_col) {
                            grid_col.label = grid_col.label.replace(/-/g, '');
                        });
                    }
                });

                $scope.sendRespondent(first).success(function (data) {
                    $scope.synchronized.push(data);
                    if (rest.length) {
                        $scope.syncronize(rest);
                    } else {
                        $scope.busy = false;
                        _.each($scope.synchronized, function (synced) {
                            $scope.respondents = _.without($scope.respondents,
                                _.findWhere($scope.respondents, { uuid: synced.uuid }));
                            delete $scope.respondentIndex[synced.uuid];
                            delete app.respondents[synced.uuid];
                            localStorage.removeItem('hapifish-'+ synced.uuid);
                            $scope.saveState();
                        })
                        $scope.synchronized = [];

                    }
                    
                });    
            }
            
        }


        $scope.resume = function(respondent) {
            var url;
            if (respondent.resumePath) {
                $location.path(respondent.resumePath);
            }
            
            if (respondent.responses.length) {
                url = [
                    '/survey',
                    respondent.survey,
                    _.last(respondent.responses).question.slug,
                    respondent.uuid
                ].join('/');

            } else {
                url = [
                    '/survey',
                    respondent.survey,
                    _.first(_.findWhere(app.surveys, {slug: respondent.survey}).questions).slug,
                    respondent.uuid
                ].join('/');
            }
            
           $location.path(url);
        }
});