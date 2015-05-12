//
var Script = function(){
	this.arrBufferInput 	= [];
	this.arrBufferOuput 	= [];
};

Script.prototype.start = function(){
	// load + read file
	this.getFile();
	this.calculationAlgorithm();
	this.writeFile();
};

Script.prototype.getFile = function(){
	var args = process.argv;
	var that = this;
	args.forEach(function (val, index, array) {
		if(val.indexOf(".txt")>0){
			console.log(val);
			var fs = require("fs");
			fs.readFile(val, function (err, data) {
				if (err) {
					throw err;
				}
				var  d = data.toString();
				var input = that.parseStringToInput(d);
				input.fileName = val;
				that.arrBufferInput.push(input);
			});
		}	
	});
};

Script.prototype.parseStringToInput = function(str){
	//console.log("Parse data:  " + str);
	var strSplits = str.split("\r\n");
	var rs ={
		machine :[],
		job:[]
	};
	rs.s = strSplits[0].substring(0,strSplits[0].indexOf("//")).trim();
	rs.m = strSplits[1].substring(0,strSplits[1].indexOf("//")).trim();
	rs.n = strSplits[2].substring(0,strSplits[2].indexOf("//")).trim();
	var i =3, commentCount =0; var kb = true;
	for(i; i < strSplits.length; i++){
		if(strSplits[i].trim() ==""){
			continue;
		}
		if(strSplits[i].trim().indexOf("//")== 0){
			if(commentCount ==0){
				kb = true;
			}else{
				kb = false;
			}
			commentCount++;
			continue;
		}
		var rowData = strSplits[i].substring(0, strSplits[i].indexOf("//")).trim().split(" ");
		if(kb){
			// Read machine matrix
			var machine = {
				p: rowData[0],
				q: rowData[1],
				a: rowData[2]
			};
			rs.machine.push(machine);
		}else{
			// Read Job matrix
			rs.job.push(rowData);
		}
	}
	return rs;
};

Script.prototype.canCalculation = function(){
	return this.arrBufferInput.length > 0;
}
Script.prototype.calculationAlgorithm = function(){
	if( !this.canCalculation()){
		setTimeout(this.calculationAlgorithm.bind(this), 100);
		return;
	}
	var input 	= this.arrBufferInput.shift();
	console.log(input);
	var ouput 	= this.algorithm(input);

	//console.log(input.n);
	var result 	= {
		input 	: input, // cua ngan
		output 	: ouput
	}

	this.arrBufferOuput.push(result);

};

Script.prototype.algorithm = function(input){
	var combineJobs = this.combineJob(input);
	var startTime =0;
	var rs =[];
	while(combineJobs.length > 0){
		var longest = null;
		startTime++;
		var indexOfEl = -1;
		combineJobs.forEach(function(el, idx, arr){
			if((startTime==1 || startTime% el.processUnitTime==0) && el.startTimes.length != el.package.length){
				// Process can start
				if(longest == null){
					longest = el;
					indexOfEl = idx;
				}else if(longest.totalTime < el.totalTime){
					longest = el;
					indexOfEl =idx;
				}
			}
		});
		if(longest != null){
			longest.startTimes.push(startTime);
			longest.totalTime -= longest.processUnitTime;
			if(longest.startTimes.length == longest.package.length){
				combineJobs.splice(indexOfEl, 1);
				rs.push(longest);
			}
		}
	};
	return rs;
};

//
// return a package for each machine as the result 
// result = [ machine1, machine2, machine3]
// machine1 = {
//		row:[[{job: xx, quantity: yy},{job: xx, quantity: yy}],...],
//		totalTime: xxx
//		processUnitTime :yy}

Script.prototype.combineJob = function(input){
	var rs =[];
	var i=0;
	input.machine.forEach(function(el, index, arr){
		var machine ={
			totalTime: 0,
			processUnitTime : el.p,
			package: [],
			startTimes:[]
		};
		
		var j =[];
		input.job.forEach(function(job, idx, arr1){
			j.push(job[index]);
		});
		var totalOfcurrentPackage =0;	
		var currentJob = 1;
		var data =[];
		while(j.length > 0){
			var quantity = el.q - totalOfcurrentPackage;
			data.push({job : currentJob, quantity: quantity});
			if(j[0]>= quantity){
				totalOfcurrentPackage =0;
				if(j[0]== quantity){
					j.shift();
					currentJob++;
				}else{
					j[0] -= quantity;
				}
				machine.package.push(data);
				data =[];
			}else{
				totalOfcurrentPackage +=quantity;
				currentJob++;
				j.shift();
			}
		}
		
		if(data.length > 0){
			machine.package.push(data);
		}
		
		machine.totalTime = machine.package.length * machine.processUnitTime;
		
		rs.push(machine);
	});
	return rs;
};

Script.prototype.writeFile = function()
{
	var that = this;
	if( !this.arrBufferOuput.length)	{
		setTimeout(this.writeFile.bind(this), 50);
		return;
	}
	var output = this.arrBufferOuput.shift();
	var str =  output.input.s + " // s\r\n";
	str += output.input.m + " // m\r\n";
	str += output.input.n +" // n\r\n";
	str+="\r\n// p, q, a\r\n"
	var index =1;
	output.input.machine.forEach(function(element, idx, array){
		str += element.p +" " + element.q +" "+ element.a +" // M" +index +"\r\n";
		index++;
	});
	str+="\r\n//"
	for(var j =1; j <= index;j++){
		str += " M" + j;
	}
	str += "\r\n";
	index =1;
	output.input.job.forEach(function(el, idx, arr){
		el.forEach(function(el1, idx1, arr1){
			str += el1 +" ";
		});
		str += "// J" + index +"\r\n";
		index ++;
	});
	//TODO: Implement write 
	output.output.forEach(function(el, idx, arrs){
		el.startTimes.forEach(function(el1, idx1, arr1){
			if(idx1 ==0){
				str += "("+ el1 +";";	
			}else {
				str += " ("+ el1 +";";
			}
			
			str += that.packageToString(el.package[idx1]);
			str += ")";
			
		});
		str += "\r\n";
	});
	
	// Write data into file
	fs = require('fs');
	fs.writeFile("output_for_" + output.input.fileName, str, function (err) {
	  if (err) return console.log(err);
	  //
	});
};

Script.prototype.packageToString = function(pack){
	var rs = "";
	pack.forEach(function(p, indx, arr){
		if(indx> 0){
			rs += "+" + p.job +"." + p.quantity;
		}else{
			rs += p.job +"." + p.quantity;
		}
	});
	return rs;
};

var script = new Script();
script.start();