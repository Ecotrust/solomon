
angular.module('askApp')
    .directive('datePicker', function() {

    return {
        template: '<input class="datepicker" ng-model="answer">',
        restrict: 'EA',
        transclude: true,
        replace: true,
        scope: {
            answer: '=answer'
        },
        link: function (scope, element, attrs) {
            var picker;
            element.pickadate({
                format: 'dd-mm-yyyy'
            });
            picker = element.pickadate('picker');
            picker.on('set', function () {
                var picker = this;
                scope.$apply(function (s) {
                    s.answer = picker.get();
                });
            });
        }
    }
});


angular.module('askApp')
    .directive('timePicker', function() {

    return {
        template: '<input class="timepicker">',
        restrict: 'EA',
        transclude: true,
        replace: true,
        scope: {
            answer: '=answer'
        },
        link: function (scope, element, attrs) {
            var picker, now = new Date();
            element.pickatime({
                format: 'HH:i',
                formatSubmit: 'HH:i',
                interval: 15
            });
            picker = element.pickatime('picker');

            if (scope.answer) {
                // picker.set('select', scope.answer);
                picker.set('select', [scope.answer.split(':')[0], scope.answer.split(':')[1]]);    
            } else {
                picker.set('select', [now.getHours(), now.getMinutes()]);    
            }
            
            picker.on('set', function () {
                var picker = this;
                scope.$apply(function (s) {
                    s.answer = picker.get();    
                });
            });

        }
    }
});