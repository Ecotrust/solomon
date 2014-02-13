angular.module('askApp')
    .directive('printButton', function() {
            return {
                template: '<a id="print_button" class="btn btn-warning" ng-click="print()"><i class="icon-print"></i> Print</a>',
                restrict: 'EA',
                transclude: true,
                replace: true,
                link: function(scope) {
                    scope.print = function() { window.print(); };
                }
            }
        }
    );
angular.module('askApp')
    .directive('dateRangePicker', function() {

        return {
            template: '<div><i class="icon-calendar icon-large"></i> <span ng-bind="displayMin"></span> to <span ng-bind="displayMax"></span></div>',
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                min: "=min",
                max: "=max",
                start: "=start",
                end: "=end"

            },
            link: function(scope, element, attrs) {
                var min, max;
                var initializePicker = _.once(function(start, end) {
                    // element.val(_.string.sprintf("%s - %s", start, end));
                    element.daterangepicker({
                        format: 'DD-MM-YYYY',
                        startDate: start,
                        endDate: end,
                        minDate: start,
                        maxDate: end,
                        opens: 'left',
                        showDropdowns: true,
                        ranges: {
                            'Today': [moment(), moment()],
                            'Yesterday': [moment().subtract('days', 1), moment().subtract('days', 1)],
                            'Last 7 Days': [moment().subtract('days', 6), moment()],
                            'Last 30 Days': [moment().subtract('days', 29), moment()],
                            'This Month': [moment().startOf('month'), moment().endOf('month')],
                            'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
                        }
                    }, function(start, end) {
                        scope.$apply(function(s) {
                            s.start = start;
                            s.displayMin = (new Date(start)).toString('dd-MM-yyyy')
                            s.end = end;
                            s.displayMax = (new Date(end)).toString('dd-MM-yyyy')
                        });
                    });
                });


                scope.$watch('min', function(newValue) {
                    if (newValue) {
                        scope.displayMin = min = (new Date(newValue)).toString('dd-MM-yyyy');
                        if (max && min) {
                            initializePicker(min, max);
                        }
                    }

                });
                scope.$watch('max', function(newValue) {
                    if (newValue) {
                        scope.displayMax = max = (new Date(newValue)).toString('dd-MM-yyyy');
                        if (max && min) {
                            initializePicker(min, max);
                        }
                    }
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
            link: function(scope, element, attrs) {
                var scroller = element.scroller({
                    preset: 'time',
                    mode: 'clickpick',
                    // theme: 'android-ics light',
                    onSelect: function(date) {
                        scope.$apply(function(s) {
                            s.answer = date;
                        });
                    }
                });

                if (scope.answer) {
                    scroller.scroller('setValue', scope.answer, true);
                }

            }
        }
    });
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
            var scroller = element.scroller({
                preset: 'date',
                mode: 'clickpick',
                // theme: 'android-ics light',
                dateFormat : "dd/mm/yy",
                dateOrder: 'ddmmy',
                onSelect: function (date) {
                     scope.$apply(function (s) {
                        s.answer = date;    
                    });
                }
            });

            if (scope.answer) {
                scroller.scroller('setValue', scope.answer, true);
            }
        }
    }
});
