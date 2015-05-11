var args = process.argv;
args.forEach(function (val, index, array) {
	if(val.indexOf(".txt")>0){
		console.log(val);
		var fs = require("fs");
		fs.readFile(val, function (err, data) {
		if (err) {
				 throw err;
			}
			console.log(data.toString());
		});
	}	
});