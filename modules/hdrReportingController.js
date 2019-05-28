function reportFasta(filePath) {
	var fastaDocument = loadFasta(filePath);
	var resultMap = initResultMap(fastaDocument);
	resolveGenotypeAndDirection(fastaDocument, resultMap);
	resolveRotation(fastaDocument, resultMap);
	
	return { hdrReportingResult : {
		"resultMap": resultMap
	} };
}

function resolveRotation(fastaDocument, resultMap) {
	var rotatorResultObjs;
	glue.inMode("module/hbvBlastSequenceRotator", function() {
		rotatorResultObjs = glue.tableToObjects(glue.command({"rotate": {
			"fasta-document": {
				"fastaCommandDocument": fastaDocument
			}
		}}));
	});
	_.each(rotatorResultObjs, function(rotatorResultObj) {
		var resultObj = resultMap[rotatorResultObj.querySequenceId];
		if(rotatorResultObj.status == "ROTATION_NECESSARY") {
			resultObj.rotationStatus = "RESOLVED";
			resultObj.rotationNts = rotatorResultObj.rotationNts;
		} else if(rotatorResultObj.status == "NO_ROTATION_NECESSARY") {
			resultObj.rotationStatus = "RESOLVED";
			resultObj.rotationNts = 0;
		} else {
			resultObj.rotationStatus = "FAILED";
			resultObj.rotationNts = null;
		}
	});
	// apply rotation to fasta document as necessary
	_.each(fastaDocument.nucleotideFasta.sequences, function(sequenceObj) {
		var resultObj = resultMap[sequenceObj.id];
		// rotationNts interpreted as the number of nt positions to shift to the right
		if(resultObj.rotationStatus == "RESOLVED" && resultObj.rotationNts > 0) {
			var leftShift = sequenceObj.sequence.length - resultObj.rotationNts;
			sequenceObj.sequence = 
				sequenceObj.sequence.substring(leftShift) 
				+ sequenceObj.sequence.substring(0, leftShift);
		}
	});
}

function resolveGenotypeAndDirection(fastaDocument, resultMap) {
	var recogniserResultObjs;
	glue.inMode("module/hbvGenotypeRecogniser", function() {
		recogniserResultObjs = glue.tableToObjects(glue.command({"recognise": {
			"fasta-document": {
				"fastaCommandDocument": fastaDocument
			}
		}}));
	});
	var recogniserResultGroups = _.groupBy(recogniserResultObjs, "querySequenceId");
	_.each(_.pairs(recogniserResultGroups), function(pair) {
		var querySequenceId = pair[0];
		var resultObj = resultMap[querySequenceId];
		
		var genotypes = _.map(pair[1], function(row) {return row.categoryId});
		
		resultObj.genotypingStatus = "FAILED";
		resultObj.genotype = null;
		if(genotypes.length == 1) {
			if(genotypes[0] != null) {
				resultObj.genotypingStatus = "RESOLVED";
				resultObj.genotype = genotypes[0];
			}
		} else if(genotypes.length > 1) {
			resultObj.genotypingStatus = "UNCLEAR";
		}
		
		var directions = _.map(pair[1], function(row) {return row.direction});
		resultObj.directionStatus = "FAILED";
		resultObj.direction = null;
		if(directions.length == 1) {
			if(directions[0] != null) {
				resultObj.directionStatus = "RESOLVED";
				resultObj.direction = directions[0];
			}
		} else if(directions.length > 1) {
			resultObj.directionStatus = "UNCLEAR";
		}
	});
	// apply reverse complementing to fasta document as necessary
	_.each(fastaDocument.nucleotideFasta.sequences, function(sequenceObj) {
		var resultObj = resultMap[sequenceObj.id];
		if(resultObj.directionStatus == "RESOLVED" && resultObj.direction == "REVERSE") {
			glue.inMode("module/hbvFastaUtility", function() {
				sequenceObj.sequence = glue.command(["reverse-complement", "string", "-s", sequenceObj.sequence]).reverseComplementFastaResult.reverseComplement;
			});
		}
	});

}

function initResultMap(fastaDocument) {
	var resultMap = {};
	_.each(fastaDocument.nucleotideFasta.sequences, function(sequenceObj) {
		resultMap[sequenceObj.id] = {};
	});
	return resultMap;
}

function loadFasta(filePath) {
	var fastaDocument;
	glue.inMode("module/hbvFastaUtility", function() {
		fastaDocument = glue.command(["load-nucleotide-fasta", filePath]);
	});
	return fastaDocument;
}
