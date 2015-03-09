angular.module('uploadApp', ['angularFileUpload', 'ui.bootstrap', 'ngRoute'])
    .config(function ($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'pages/uploadPage.html',
                controller: 'UploadController'
            })
            .when('/serverState', {
                templateUrl: 'pages/serverStatePage.html',
                controller: 'ServerStateController'
            })
            .when('/result', {
                templateUrl: 'pages/resultPage.html',
                controller: 'ResultController'
            })
            .when('/config', {
                templateUrl: 'pages/configPage.html'
            })
    })
    .controller('UploadController', ['$scope', 'FileUploader', '$modal', function ($scope, FileUploader, $modal) {
        var uploader = $scope.uploader = new FileUploader({
            url: '/uploads/'
        });

        uploader.onErrorItem = function (fileItem, response, status, headers) {
            //console.info(response, status, headers);
        };

        $scope.uploader.onSuccessItem = function (fileItem, response, status, headers, uploader) {
            fileItem.result = response;
            console.log($scope.uploader);
            console.log(uploader);
        };

        $scope.setModalData = function (item) {
            $scope.modalName = item.file.name;
            $scope.modalData = item.result;
        }

        $scope.closeAlert = function () {
            $('#alert').remove();
        }
    }])
    .controller('ServerStateController', ['$scope', function ($scope) {
        var processGraph,
            socket = io();

        $scope.processStats = [];
        $scope.processStatsLimit = 20;
        $scope.clearData = function () {
            $scope.processStats = [];
        }

        nv.addGraph(function () {
            processGraph = nv.models.lineChart()
                .margin({left: 100})  //Adjust chart margins to give the x-axis some breathing room.
                .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!
                .transitionDuration(350)  //how fast do you want the lines to transition?
                .showLegend(true)       //Show the legend, allowing users to turn on/off line series.
                .showYAxis(true)        //Show the y-axis
                .showXAxis(true)        //Show the x-axis
            ;

            processGraph.xAxis     //Chart x-axis settings
                .axisLabel('Time (ms)')
                .tickFormat(function (d) {
                    return d3.time.format('%X')(new Date(d));
                });

            processGraph.yAxis     //Chart y-axis settings
                .axisLabel('Heap Memory Usage (MB)')
                .tickFormat(d3.format('.02f'));

            nv.utils.windowResize(function () {
                processGraph.update()
            });


            processGraph.redraw = function (data) {
                d3.select('#chart svg')
                    .datum(
                    [
                        {
                            values: data,      //values - represents the array of {x,y} data points
                            key: 'Heap Usage (MB)', //key  - the name of the series.
                            color: '#ff7f0e'  //color - optional: choose your own line color.
                        }
                    ]
                )
                    .transition().duration(500)
                    .call(processGraph);
            }


            return processGraph;
        });


        socket.on('free memory', function (msg) {
            while ($scope.processStats.length >= $scope.processStatsLimit) {
                $scope.processStats.shift();
            }
            $scope.processStats.push({x: Date.now(), y: msg[0] / (1024 * 1024)});
            processGraph.redraw($scope.processStats);
        });

    }])
    .controller('ResultController', ['$scope', '$http', function ($scope, $http) {
        $scope.results = [];

        $http.get('/uploads').success(function (data, status, headers, config) {
            $scope.results = data;

            $scope.results.forEach(function (result, index) {
                    nv.addGraph(function () {
                        var processGraph = nv.models.lineChart()
                                .margin({left: 100})  //Adjust chart margins to give the x-axis some breathing room.
                                .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!
                                .transitionDuration(350)  //how fast do you want the lines to transition?
                                .showLegend(true)       //Show the legend, allowing users to turn on/off line series.
                                .showYAxis(true)        //Show the y-axis
                                .showXAxis(true)        //Show the x-axis
                            ;

                        processGraph.xAxis     //Chart x-axis settings
                            .axisLabel('Time (ms)')
                            .tickFormat(function (d) {
                                return d3.time.format('%X')(new Date(d));
                            });

                        processGraph.yAxis     //Chart y-axis settings
                            .axisLabel('Heap Memory Usage (MB)')
                            .tickFormat(d3.format('.02f'));

                        d3.select('#chart' + index + ' svg')   //Select the <svg> element you want to render the chart in.
                            .datum(
                                [
                                    {
                                        values: result.monitorStat.map(function(stat) {
                                            return {
                                                x: stat.date,
                                                y: stat.heap/ (1024 * 1024)
                                            }
                                        }),      //values - represents the array of {x,y} data points
                                        key: 'Heap Usage (MB)', //key  - the name of the series.
                                        color: '#ff7f0e'  //color - optional: choose your own line color.
                                    },
                                    {
                                        values: result.monitorStat.map(function(stat) {
                                            return {
                                                x: stat.date,
                                                y: stat.totalHeap/ (1024 * 1024)
                                            }
                                        }),      //values - represents the array of {x,y} data points
                                        key: 'Total Heap (MB)', //key  - the name of the series.
                                        color: '#575757'  //color - optional: choose your own line color.
                                    }
                                ])         //Populate the <svg> element with chart data...
                            .call(processGraph);          //Finally, render the chart!


                        nv.utils.windowResize(function () {
                            processGraph.update()
                        });

                        return processGraph;
                    });
                }
            )

        });


    }])
    .directive('ngThumb', ['$window', function ($window) {
        var helper = {
            support: !!($window.FileReader && $window.CanvasRenderingContext2D),
            isFile: function (item) {
                return angular.isObject(item) && item instanceof $window.File;
            },
            isImage: function (file) {
                var type = '|' + file.type.slice(file.type.lastIndexOf('/') + 1) + '|';
                return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
            }
        };

        return {
            restrict: 'A',
            template: '<canvas/>',
            link: function (scope, element, attributes) {
                if (!helper.support) return;

                var params = scope.$eval(attributes.ngThumb);

                if (!helper.isFile(params.file)) return;
                if (!helper.isImage(params.file)) return;

                var canvas = element.find('canvas');
                var reader = new FileReader();

                reader.onload = onLoadFile;
                reader.readAsDataURL(params.file);

                function onLoadFile(event) {
                    var img = new Image();
                    img.onload = onLoadImage;
                    img.src = event.target.result;
                }

                function onLoadImage() {
                    var width = params.width || this.width / this.height * params.height;
                    var height = params.height || this.height / this.width * params.width;
                    canvas.attr({width: width, height: height});
                    canvas[0].getContext('2d').drawImage(this, 0, 0, width, height);
                }
            }
        };
    }]);

