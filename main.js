var Constants = {
    DEFAULT: 0,
    K_MEANS: 1,
    ACA: 2,
    RANDOM: 3
};

var Script = function () {
    this.arrBufferInput = [];
    this.arrBufferOuput = [];
    this.debugMode = false;
    this.K_NUMBER = 3;
    this.mode = Constants.DEFAULT;
};

Script.prototype.start = function () {
    // load + read file
    var args = process.argv;
    var that = this;
    args.forEach(function (el, idx, arr) {
        if (el == "-html") {
            that.debugMode = true;
        } if (el == "-k") {
            that.mode = Constants.K_MEANS;
            that.K_NUMBER = 1 * args[idx + 1];
        } else if (el == "-a") {
            that.mode = Constants.ACA;
            that.K_NUMBER = 1 * args[idx + 1];
        } else if (el == "-r") {
            that.mode = Constants.RANDOM;
        }

    });

    this.getFile();
    this.calculationAlgorithm();
    this.writeFile();
};

Script.prototype.getFile = function () {
    var args = process.argv;
    var that = this;
    args.forEach(function (val, index, array) {
        if (val.indexOf(".txt") > 0) {
            //console.log(val);
            var fs = require("fs");
            fs.readFile(val, function (err, data) {
                if (err) {
                    throw err;
                }
                var d = data.toString();
                var input = that.parseStringToInput(d);
                input.fileName = that.getFilename(val);
                that.arrBufferInput.push(input);
            });
        }
    });
};
Script.prototype.getFilename = function (fullPath) {
    var fileName = fullPath.replace(/^.*(\\|\/|\:)/, '');
    //console.log(fileName);
    return fileName;
};
Script.prototype.parseStringToInput = function (str) {
    //console.log("Parse data:  " + str);
    var strSplits = str.split("\r\n");
    var rs = {
        machine: [],
        job: []
    };
    rs.s = strSplits[0].substring(0, strSplits[0].indexOf("//")).trim();
    rs.m = strSplits[1].substring(0, strSplits[1].indexOf("//")).trim();
    rs.n = strSplits[2].substring(0, strSplits[2].indexOf("//")).trim();
    var i = 3, commentCount = 0; var kb = true;
    var jobCount = 0;
    for (i; i < strSplits.length; i++) {
        if (strSplits[i].trim() == "") {
            continue;
        }
        if (strSplits[i].trim().indexOf("//") == 0) {
            if (commentCount == 0) {
                kb = true;
            } else {
                kb = false;
            }
            commentCount++;
            continue;
        } else if (i == 6 + (1 * rs.m)) {
            kb = false;
            continue;
        }
        var rowData = strSplits[i].substring(0, strSplits[i].indexOf("//")).trim().split(" ");
        if (kb) {
            // Read machine matrix
            var machine = {
                p: rowData[0],
                q: rowData[1],
                a: rowData[2]
            };
            rs.machine.push(machine);
        } else {
            var jobRow = [];
            rowData.forEach(function (j, index, arr) {
                jobCount += 1 * j;
                jobRow.push(1 * j);
            });
            rs.job.push(jobRow);
        }
    }
    //console.log('finish read file');
    rs.jobCount = jobCount;
    return rs;
};

Script.prototype.canCalculation = function () {
    return this.arrBufferInput.length > 0;
}

Script.prototype.calculationAlgorithm = function () {
    if (!this.canCalculation()) {
        setTimeout(this.calculationAlgorithm.bind(this), 100);
        return;
    }
    var input = this.arrBufferInput.shift();
    input.startAlgorithm = new Date();
    //console.log(input);
    var ouput = this.algorithm(input);
    ouput.endAlgorithm = new Date();
    //console.log(input.n);
    var result = {
        input: input, // cua ngan
        output: ouput,
        processTime: (ouput.endAlgorithm.getTime() - input.startAlgorithm.getTime()) / 1000
    }
    //var now = new Date();
    console.log('Job Count: ' + input.jobCount + ' ;Last Job Finish: ' + ouput.lastTime + ' ; Algorithm Calculate Time : ' + result.processTime);
    this.arrBufferOuput.push(result);

};

Script.prototype.algorithm = function (input) {
    var combineJobs = this.combineJob(input);
    //console.log(combineJobs);
    var startTime = 0;
    var rs = [];
    for (var i = 0; i < combineJobs.length; i++) {
        rs.push(null);
    }
    var lastTime = 0;
    while (combineJobs.length > 0) {
        //console.log('jobs: ' + combineJobs.length + '; startTime: ' + startTime );
        var longest = null;
        startTime++;
        var indexOfEl = 0;
        combineJobs.forEach(function (el, idx, arr) {
            if (startTime == 1 || (el.lastProcess == undefined || (startTime >= el.lastProcess))) {
                // Process can start
                if (longest == null) {
                    longest = el;
                    indexOfEl = idx;
                } else if (longest.totalTime < el.totalTime) {
                    longest = el;
                    indexOfEl = idx;
                } else if (longest.totalTime == el.totalTime && longest.processUnitTime < el.processUnitTime) {
                    longest = el;
                    indexOfEl = idx;
                }
            }
        });
        if (longest != null) {
            longest.startTimes.push(startTime);
            longest.lastProcess = startTime + longest.processUnitTime;

            longest.totalTime -= longest.processUnitTime;
            lastTime = lastTime > (startTime + longest.processUnitTime) ? lastTime : (startTime + longest.processUnitTime);
            if (longest.startTimes.length >= longest.package.length) {
                combineJobs.splice(indexOfEl, 1);
                rs[longest.name] = longest;
            }
        }
    };
    rs.lastTime = lastTime;
    return rs;
};

Script.prototype.combineJob = function (input) {
    var that = this;
    var rs = [];
    var i = 0;
    input.machine.forEach(function (el, mIndex, arr) {
        var machine = {
            totalTime: 0,
            processUnitTime: 1 * el.p,
            processQty: 1 * el.q,
            package: [],
            startTimes: [],
            name: mIndex
        };

        var jobsOfCurrentMachine = []; // { jobName : x, jobQty: y , minTime: z};
        input.job.forEach(function (job, idx, arr1) {
            var minTime = 0;
            job.forEach(function (j, idx1, arr2) {
                var process = Math.ceil(1 * j / (1 * input.machine[idx1].p));
                minTime = minTime > process ? minTime : process;
            });
            jobsOfCurrentMachine.push({ jobName: (idx + 1), jobQty: (1 * job[mIndex]), minTime: minTime }); // Push all job for this machine and process it.
        });

        ///// --- Apply herictic for arrange job for this machine --
        if (that.mode == Constants.K_MEANS) {
            jobsOfCurrentMachine = that.kmeansAlgorithm({ processTime: machine.processUnitTime, qty: machine.processQty, jobs: jobsOfCurrentMachine });
        } else if (that.mode == Constants.ACA) {
            jobsOfCurrentMachine = that.acaAlgorithm({ processTime: machine.processUnitTime, qty: machine.processQty, jobs: jobsOfCurrentMachine });
        } else if (that.mode == Constants.RANDOM) {
            jobsOfCurrentMachine = that.randomAlgorithm(jobsOfCurrentMachine);
        }
        /// ----- End apply herictic
        //console.log(jobsOfCurrentMachine);

        var totalOfcurrentPackage = 0;
        var data = [];
        while (jobsOfCurrentMachine.length > 0) {
            var selectedJob = jobsOfCurrentMachine[0];
            if (selectedJob.jobQty == 0) {
                jobsOfCurrentMachine.shift();
                continue;
            }
            var capility = el.q - totalOfcurrentPackage;
            var quantity = selectedJob.jobQty >= capility ? capility : selectedJob.jobQty;
            totalOfcurrentPackage += quantity;
            data.push({ job: selectedJob.jobName, quantity: quantity });

            selectedJob.jobQty -= quantity;

            if (totalOfcurrentPackage == el.q) {
                totalOfcurrentPackage = 0;
                machine.package.push(data);
                data = [];
            }
        }

        if (data.length > 0) {
            machine.package.push(data);
        }
        //console.log(machine);
        machine.totalTime = machine.package.length * machine.processUnitTime;

        rs.push(machine);
    });
    return rs;
};

Script.prototype.writeFile = function () {
    //

    var that = this;
    if (!this.arrBufferOuput.length) {
        setTimeout(this.writeFile.bind(this), 50);
        return;
    }
    var output = this.arrBufferOuput.shift();
    var str = output.input.s + " // s\r\n";
    str += output.input.m + " // m\r\n";
    str += output.input.n + " // n\r\n";
    str += "\r\n// p, q, a\r\n"
    var index = 1;
    output.input.machine.forEach(function (element, idx, array) {
        str += element.p + " " + element.q + " " + element.a + " // M" + index + "\r\n";
        index++;
    });
    str += "\r\n//"
    for (var j = 1; j <= index; j++) {
        str += " M" + j;
    }
    str += "\r\n";
    index = 1;
    output.input.job.forEach(function (el, idx, arr) {
        el.forEach(function (el1, idx1, arr1) {
            str += el1 + " ";
        });
        str += "// J" + index + "\r\n";
        index++;
    });
    //TODO: Implement write 
    str += '\r\n';
    output.output.forEach(function (el, idx, arrs) {
        //str += el.name;
        el.startTimes.forEach(function (el1, idx1, arr1) {
            if (idx1 == 0) {
                str += "(" + el1 + ";";
            } else {
                str += " (" + el1 + ";";
            }

            str += that.packageToString(el.package[idx1]);
            str += ")";

        });
        str += "\r\n";
    });

    // Write data into file
    fs = require('fs');
    fs.writeFile("output/output_for_" + output.input.fileName, str, function (err) {
        if (err) return console.log(err);
        //
    });


    // If in debug mode we should write html for easy to see the output
    if (this.debugMode) {
        this.writeHtml(output);
    }
    this.writeStatistical(output);
};
Script.prototype.writeHtml = function (output) {
    var totalColumn = 0;
    output.output.forEach(function (el, index, arr) {
        if (el.startTimes[el.startTimes.length - 1] + el.processUnitTime > totalColumn) {
            totalColumn = el.startTimes[el.startTimes.length - 1] + el.processUnitTime;
        }
    });

    var str = '<html><head><link href="style.css" rel="stylesheet"></head><body><h3>JOB SCHEDULING</h3><div  style="float:left;"><table cellspacing="0">';
    output.output.forEach(function (el, idx, arr) {
        for (var h = 0 ; h < el.processQty; h++) {
            if (h == 0) {
                str += '<tr><td rowspan="' + el.processQty + '">M' + (el.name + 1) + '</td>'
            } else {
                str += '<tr>';
            }

            var blocks = [];
            el.package.forEach(function (p, idx1, arr1) {
                var currentHeight = 0;
                p.forEach(function (b, idx2, arr2) {
                    currentHeight += b.quantity;
                    var block = {
                        x: el.startTimes[idx1],
                        y: el.processQty - currentHeight,
                        qty: b.quantity,
                        job: b.job
                    };
                    blocks.push(block);
                });
            });

            // Draw each block for job 
            for (var j = 0; j < totalColumn; j++) {
                var minY = -1;
                var block = null;
                for (var t = 0; t < blocks.length; t++) {
                    if (blocks[t].x == j) {
                        if (blocks[t].y < minY || minY < 0) {
                            minY = blocks[t].y;
                        }
                        if (blocks[t].y == h) {
                            block = blocks[t];
                        }
                    }
                }

                if (block != null) {

                    str += '<td align="center" colspan="' + el.processUnitTime + '" rowspan="' + block.qty + '" class="job' + block.job + '"> J' + block.job + '</td>';
                    j += el.processUnitTime - 1;
                } else {

                    if (minY >= 0) {

                        if (minY <= h) {
                            j += el.processUnitTime - 1; // subtract 1 becasue the loop will increase it
                        } else {
                            str += '<td class="cell"></td>';
                        }
                    } else {
                        str += '<td class="cell"></td>';
                    }
                }
            }

            str += '</tr>';
        }
        // add empty row

        str += '<tr>';
        for (var i = 0; i <= totalColumn; i++) {
            str += '<td class="cell"></td>'
        }
        str += '</tr>';
    });
    str += '<tr>'
    for (var t = 0; t <= totalColumn; t++) {
        str += '<td align="center">' + (t == 0 ? "" : (t - 1)) + '</td>';
    }
    str + '</tr>';
    str += '</table></div><br/>';
    str += '<div style="width:60px; float:left; margin-left: 20px;">'
    output.input.job.forEach(function (e, idx, arrs) {
        str += '<span class="job' + (idx + 1) + '"> JOB ' + (idx + 1) + '</span> <br />'
    });
    str += '</div></body></html>';
    fs = require('fs');
    fs.writeFile("output/output_for_" + output.input.fileName + ".html", str, function (err) {
        if (err) return console.log(err);
        //
    });
};

Script.prototype.packageToString = function (pack) {
    var rs = "";
    pack.forEach(function (p, indx, arr) {
        if (indx > 0) {
            rs += "+" + p.job + "." + p.quantity;
        } else {
            rs += p.job + "." + p.quantity;
        }
    });
    return rs;
};

Script.prototype.writeStatistical = function (output) {
    var that = this;
    fs = require('fs');
    var fileName = "Statistical/0.txt";
    if (that.mode == Constants.K_MEANS) {
        fileName = "Statistical/1.txt";
    } else if (that.mode == Constants.ACA) {
        fileName = "Statistical/2.txt";
    } else if (that.mode == Constants.RANDOM) {
        fileName = "Statistical/3.txt";
    }
    fs.appendFile(fileName, output.input.jobCount + ';' + output.processTime + ';' + output.output.lastTime + '\r\n', function (err) {
        if (err) return console.log(err);
        //
    });
}
// -----------------------------------------------------------------------------------------------------//
// input is machine structure as: { processTime:x, qty: y, jobs:[{ jobName: xxxx, jobQty: yyyyy , minTime: zzzz}]}  ---//
//------------------------------------------------------------------------------------------------------//
Script.prototype.kmeansAlgorithm = function (input) {
    var that = this;
    var jobs = [];
    var minx = miny = minz = Number.MAX_VALUE;
    var clusters = [];
    var maxx = maxy = maxz = 0;
    input.jobs.forEach(function (j, idx, arr) {
        var item = { jobName: j.jobName, jobQty: j.jobQty, x: j.jobQty, y: Math.ceil(j.jobQty / input.qty) * input.processTime, z: j.minTime };
        jobs.push(item);
        minx = minx > item.x ? item.x : minx;
        miny = miny > item.y ? item.y : miny;
        minz = minz > item.z ? item.z : minz;

        maxx = maxx > item.x ? maxx : item.x;
        maxy = maxy > item.y ? maxy : item.y;
        maxz = maxz > item.z ? maxz : item.z;
    });

    for (var i = 0; i < that.K_NUMBER; i++) {
        var cluster = {};
        cluster.x = Math.floor(Math.random() * (maxx - minx) + minx);
        cluster.y = Math.floor(Math.random() * (maxy - miny) + miny);
        cluster.z = Math.floor(Math.random() * (maxz - minz) + minz);
        cluster.items = [];
        clusters.push(cluster);
    }
    var hasChange = true;
    while (hasChange) {
        // clear all cluster item and recalculate it again
        clusters.forEach(function (el, idx, arr) {
            el.items.splice(0, el.items.length);
        });
        jobs.forEach(function (job, idx, arr) {
            var shortest = Number.MAX_VALUE;
            var cluster = null;
            clusters.forEach(function (cl, idx1, arr1) {
                var distance = Math.pow(cl.x - job.x, 2) + Math.pow(cl.y - job.y, 2) + Math.pow(cl.z - job.z, 2);
                if (distance < shortest) {

                    shortest = distance;
                    cluster = cl;
                }
            });
            if (cluster != null) {
                cluster.items.push(job);
            }
        });
        hasChange = false;
        // Recalculate the cluster position
        clusters.forEach(function (el, idx, arr) {
            if (el.items.length > 0) {
                var cx = cy = cz = 0;
                el.items.forEach(function (item, idx1, arr2) {
                    cx += item.x;
                    cy += item.y;
                    cz += item.z;
                });
                cx = Math.floor(cx / el.items.length);
                cy = Math.floor(cy / el.items.length);
                cz = Math.floor(cz / el.items.length);
                if (el.x != cx || el.y != cy || el.z != cz) {
                    hasChange = true;
                    el.x = cx;
                    el.y = cy;
                    el.z = cz;
                }
            }
        });

    }
    //console.log(clusters);
    // get data by the minTime
    var result = [];

    // sort tang dan theo z (minTime)
    clusters.sort(function (a, b) {
        return a.x - b.x;
    });

    clusters.forEach(function (cluster, idx, arr) {
        cluster.items.sort(function (a, b) { return a.x - b.x });
        cluster.items.forEach(function (item, idx1, arr) {
            //console.log('push');
            result.push({
                jobName: item.jobName, jobQty: item.jobQty, minTime: item.z
            });
        });
    });
    return result;
};
/** End KMean Algorithm***/

Script.prototype.gaAlgorithm = function () {
    //TODO:....
};

Script.prototype.acaAlgorithm = function (input) {
    var that = this;
    var jobs = [];
    var minx = miny = minz = Number.MAX_VALUE;
    var clusters = [];
    var maxx = maxy = maxz = 0;
    input.jobs.forEach(function (j, idx, arr) {
        var item = { jobName: j.jobName, jobQty: j.jobQty, x: j.jobQty, y: Math.ceil(j.jobQty / input.qty) * input.processTime, z: j.minTime };
        jobs.push(item);
        minx = minx > item.x ? item.x : minx;
        miny = miny > item.y ? item.y : miny;
        minz = minz > item.z ? item.z : minz;

        maxx = maxx > item.x ? maxx : item.x;
        maxy = maxy > item.y ? maxy : item.y;
        maxz = maxz > item.z ? maxz : item.z;
    });

    var k1 = jobs.length;
    for (var i = 0; i < k1 ; i++) {
        var cluster = {};
        cluster.x = Math.floor(Math.random() * (maxx - minx) + minx);
        cluster.y = Math.floor(Math.random() * (maxy - miny) + miny);
        cluster.z = Math.floor(Math.random() * (maxz - minz) + minz);
        cluster.items = [];
        clusters.push(cluster);
    }


    //console.log('Start calculate the cluster');
    var first = true;
    while (clusters.length > that.K_NUMBER && clusters.length > 1) {
        // clear all cluster item and recalculate it again
        clusters.forEach(function (el, idx, arr) {
            el.items.splice(0, el.items.length);
        });
        jobs.forEach(function (job, idx, arr) {
            var shortest = Number.MAX_VALUE;
            var cluster = null;
            clusters.forEach(function (cl, idx1, arr1) {
                var distance = Math.pow(cl.x - job.x, 2) + Math.pow(cl.y - job.y, 2) + Math.pow(cl.z - job.z, 2);
                if (distance < shortest) {
                    shortest = distance;
                    cluster = cl;
                }
            });
            if (cluster != null) {
                cluster.items.push(job);
            }
        });

        // Recalculate the cluster position
        if (first) {
            clusters.forEach(function (el, idx, arr) {
                if (el.items.length > 0) {
                    var cx = cy = cz = 0;
                    el.items.forEach(function (item, idx1, arr2) {
                        cx += item.x;
                        cy += item.y;
                        cz += item.z;
                    });
                    cx = Math.floor(cx / el.items.length);
                    cy = Math.floor(cy / el.items.length);
                    cz = Math.floor(cz / el.items.length);
                    if (el.x != cx || el.y != cy || el.z != cz) {
                        el.x = cx;
                        el.y = cy;
                        el.z = cz;
                    }
                }
            });
        } else {
            var newClusters = [];
            for (var i = 0; i < clusters.length ; i++) {
                var item = null;
                var shortest = Number.MAX_VALUE;
                for (var j = 0; j < clusters.length; j++) {
                    if (i != j) {
                        var distance = Math.pow(clusters[i].x - clusters[j].x, 2) + Math.pow(clusters[i].y - clusters[j].y, 2) + Math.pow(clusters[i].z - clusters[j].z, 2);
                        if (distance < shortest) {
                            shortest = distance;
                            item = clusters[j];
                        }
                    }
                }


                var centerPoint = {
                    x: Math.floor((clusters[i].x + item.x) / 2),
                    y: Math.floor((clusters[i].y + item.y) / 2),
                    z: Math.floor((clusters[i].z + item.z) / 2),
                    items: []
                };
                var exist = false;
                for (var t = 0 ; t < newClusters.length; t++) {
                    if (newClusters[t].x == centerPoint.x && newClusters[t].y == centerPoint.y && newClusters[t].z == centerPoint.z) {
                        exist = true;
                        break;
                    }
                }
                if (!exist) {
                    newClusters.push(centerPoint);
                }
            }
            clusters.splice(0, clusters.length);
            newClusters.forEach(function (item, idx, arr) {
                clusters.push(item);
            })
        }

        first = false;
    }
    // Assign the job in each clusters
    jobs.forEach(function (job, idx, arr) {
        var shortest = Number.MAX_VALUE;
        var cluster = null;
        clusters.forEach(function (cl, idx1, arr1) {
            var distance = Math.pow(cl.x - job.x, 2) + Math.pow(cl.y - job.y, 2) + Math.pow(cl.z - job.z, 2);
            if (distance < shortest) {
                shortest = distance;
                cluster = cl;
            }
        });
        if (cluster != null) {
            cluster.items.push(job);
        }
    });

    // get data by the minTime
    var result = [];

    // sort tang dan theo z (minTime)
    clusters.sort(function (a, b) {
        return a.x - b.x;
    });

    clusters.forEach(function (cluster, idx, arr) {
        cluster.items.sort(function (a, b) { return a.x - b.x });
        cluster.items.forEach(function (item, idx1, arr) {
            result.push({
                jobName: item.jobName, jobQty: item.jobQty, minTime: item.z
            });
        });
    });
    return result;
};

Script.prototype.randomAlgorithm = function (input) {
    var result = [];
    while (input.length > 0) {
        var index = Math.floor(Math.random() * input.length);
        //console.log(index);
        result.push(input[index]);
        input.splice(index, 1);
        //console.log("count: " +input.length );
    }
    return result;
};

var script = new Script();
script.start();