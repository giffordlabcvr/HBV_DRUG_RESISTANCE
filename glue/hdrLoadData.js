var drugObjs;

glue.inMode("module/tabularUtilityTab", function() {
	drugObjs = glue.tableToObjects(glue.command(["load-tabular", "tabular/drugs.txt"]));
});

_.each(drugObjs, function(drugObj) {
	glue.command(["create", "custom-table-row", "hdr_drug", drugObj.drug]);
	glue.inMode("custom-table-row/hdr_drug/"+drugObj.drug, function() {
		glue.command(["set", "field", "abbreviated_name", drugObj.abbreviatedName]);
	});
});

var rasFileString = glue.command(["file-util", "load-string", "tabular/mutations.txt"]).fileUtilLoadStringResult.loadedString;

var rasFileLines = rasFileString.split("\n");

var rasIDset = {};
var rasDrugSet = {};

var codonLabelToReferenceAa = {};

glue.inMode("reference/REF_MASTER_NC_003977/feature-location/RT", function() {
	var aaRows = glue.tableToObjects(glue.command(["amino-acid"]));
	_.each(aaRows, function(aaRowObj) {
		codonLabelToReferenceAa[aaRowObj.codonLabel] = aaRowObj.aminoAcid;
	});
});


_.each(rasFileLines, function(rasFileLine) {
	var trimmedLine = rasFileLine.trim();
	if(trimmedLine.length == 0) {
		return;
	}
	var columnVals = trimmedLine.split(/\s+/);
	var virusDomain = columnVals[0].trim();
	var codonLabel = columnVals[2].trim();
	var column4 = columnVals[4].trim();
	var residues = column4.trim().replace(/\//g, "").split("");
	var drug = columnVals[5].trim().toLowerCase();

	
	_.each(residues, function(residue) {
		var rasID = "hdr_ras:"+virusDomain+":"+codonLabel+residue;
		var rasDrugID = rasID+":"+drug;
		if(rasIDset[rasID] == null) {
			glue.inMode("reference/REF_MASTER_NC_003977/feature-location/"+virusDomain, function() {
				glue.command(["create", "variation", rasID, 
					"-t", "aminoAcidSimplePolymorphism", 
					"-d", "HBV drug resistance polymorphism "+virusDomain+":"+codonLabel+residue, 
					"-c", codonLabel, codonLabel]);
				glue.inMode("variation/"+rasID, function() {
					glue.command(["set", "metatag", "SIMPLE_AA_PATTERN", residue]);
				});
			});
			glue.command(["create", "custom-table-row", "hdr_ras", rasID]);
			glue.inMode("custom-table-row/hdr_ras/"+rasID, function() {
				glue.command(["set", "field", "display_name", codonLabelToReferenceAa[codonLabel]+codonLabel+residue]);
				glue.command(["set", "link-target", "variation", 
					"reference/REF_MASTER_NC_003977/feature-location/"+virusDomain+"/variation/"+rasID]);
			});
			rasIDset[rasID] = "yes";
		}
		if(rasDrugSet[rasDrugID] == null) {
			glue.command(["create", "custom-table-row", "hdr_ras_drug", rasDrugID]);
			glue.inMode("custom-table-row/hdr_ras_drug/"+rasDrugID, function() {
				glue.command(["set", "link-target", "hdr_drug", 
					"custom-table-row/hdr_drug/"+drug]);
			});
			glue.inMode("custom-table-row/hdr_ras/"+rasID, function() {
				glue.command(["add", "link-target", "hdr_ras_drug", 
					"custom-table-row/hdr_ras_drug/"+rasDrugID]);
			});
			rasDrugSet[rasDrugID] = "yes";
		}
	});
});