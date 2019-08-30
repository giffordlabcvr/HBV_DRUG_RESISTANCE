glue.command(["multi-unset", "link-target", "hdr_ras", "hdr_drug", "-a"]);
glue.command(["multi-unset", "link-target", "hdr_ras_alignment", "alignment", "-a"]);
glue.command(["multi-unset", "link-target", "hdr_ras_alignment", "hdr_ras", "-a"]);
glue.command(["multi-unset", "link-target", "hdr_ras_publication", "hdr_publication", "-a"]);
glue.command(["multi-unset", "link-target", "hdr_ras_publication", "hdr_ras", "-a"]);
glue.command(["multi-unset", "link-target", "variation", "hdr_ras", "-a"]);
glue.command(["multi-unset", "link-target", "hdr_vem_alignment", "alignment", "-a"]);
glue.command(["multi-unset", "link-target", "hdr_vem_alignment", "hdr_vem", "-a"]);
glue.command(["multi-unset", "link-target", "hdr_vem_publication", "hdr_publication", "-a"]);
glue.command(["multi-unset", "link-target", "hdr_vem_publication", "hdr_vem", "-a"]);
glue.command(["multi-unset", "link-target", "variation", "hdr_vem", "-a"]);




glue.command(["multi-delete", "hdr_drug", "-a"]);
glue.command(["multi-delete", "hdr_ras", "-a"]);
glue.command(["multi-delete", "hdr_vem", "-a"]);

glue.command(["multi-delete", "hdr_ras_alignment", "-a"]);
glue.command(["multi-delete", "hdr_ras_publication", "-a"]);
glue.command(["multi-delete", "hdr_vem_alignment", "-a"]);
glue.command(["multi-delete", "hdr_vem_publication", "-a"]);

glue.command(["multi-delete", "variation", "-w", "name like 'hdr_ras:%'"]);
glue.command(["multi-delete", "variation", "-w", "name like 'hdr_vem:%'"]);
glue.command(["multi-delete", "hdr_publication", "-a"]);

var pubObjs;

glue.inMode("module/tabularUtilityTab", function() {
	pubObjs = glue.tableToObjects(glue.command(["load-tabular", "tabular/hdr_publications.txt"]));
});


_.each(pubObjs, function(pubObj) {
	// glue.logInfo("pubObj", pubObj);
	glue.command(["create", "custom-table-row", "hdr_publication", pubObj.id]);
	glue.inMode("custom-table-row/hdr_publication/"+pubObj.id, function() {
		glue.command(["set", "field", "title", pubObj.title]);
		glue.command(["set", "field", "authors_short", pubObj.authors_short]);
		glue.command(["set", "field", "authors_full", pubObj.authors_full]);
		glue.command(["set", "field", "year", pubObj.year]);
		glue.command(["set", "field", "journal", pubObj.journal]);
		if(pubObj.volume != null) {
			glue.command(["set", "field", "volume", pubObj.volume]);
		}
		if(pubObj.issue != null) {
			glue.command(["set", "field", "issue", pubObj.issue]);
		}
		if(pubObj.pages != null) {
			glue.command(["set", "field", "pages", pubObj.pages]);
		}
		if(pubObj.doi != null) {
			glue.command(["set", "field", "url", pubObj.doi]);
		} else if(pubObj.url != null) {
			glue.command(["set", "field", "url", pubObj.url]);
		}
	});
});

// fill in a couple of missing URLs

glue.inMode("custom-table-row/hdr_publication/27492206", function() {
	glue.command(["set", "field", "url", "http://www.med.kobe-u.ac.jp/journal/contents/62/E1.pdf"]);
});

glue.inMode("custom-table-row/hdr_publication/26309637", function() {
	glue.command(["set", "field", "url", "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4538069/"]);
});



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

var drRowObjs;

glue.inMode("module/tabularUtilityTab", function() {
	drRowObjs = glue.tableToObjects(glue.command(["load-tabular", "tabular/DrugResistanceAlessaReformatted.txt"]));
});

// this should be the row number in the DrugResistanceAlessaReformatted spreadsheet
var rowIdx = 2;

_.each(drRowObjs, function(drRowObj) {
	// glue.logInfo("drRowObj", drRowObj);
	
	glue.command(["create", "custom-table-row", "hdr_ras", rowIdx]);
	var drugId = glue.getTableColumn(glue.command(["list", "custom-table-row", "hdr_drug", "-w", "abbreviated_name = '"+drRowObj["Drug"]+"'"]), "id")[0];
	glue.inMode("custom-table-row/hdr_ras/"+rowIdx, function() {
		glue.command(["set", "link-target", "hdr_drug", "custom-table-row/hdr_drug/"+drugId]);
	});
	
	var genotypesString = drRowObj["Genotypes"];
	var genotypes = [];
	if(genotypesString != null) {
		genotypes = genotypesString.replace(/\s/g, "").split(/,/);
	}
	
	if(genotypes.length == 0) {
		glue.command(["create", "custom-table-row", "hdr_ras_alignment", rowIdx+":AL_MASTER"]);
		glue.inMode("custom-table-row/hdr_ras_alignment/"+rowIdx+":AL_MASTER", function() {
			glue.command(["set", "link-target", "alignment", "alignment/AL_MASTER"]);
			glue.command(["set", "link-target", "hdr_ras", "custom-table-row/hdr_ras/"+rowIdx]);
		});
		
	} else {
		_.each(genotypes, function(genotype) {
			glue.command(["create", "custom-table-row", "hdr_ras_alignment", rowIdx+":"+genotype]);
			glue.inMode("custom-table-row/hdr_ras_alignment/"+rowIdx+":"+genotype, function() {
				glue.command(["set", "link-target", "alignment", "alignment/AL_"+genotype]);
				glue.command(["set", "link-target", "hdr_ras", "custom-table-row/hdr_ras/"+rowIdx]);
			});
		});
	}

	var publicationsString = drRowObj["Publications"];
	var publications = [];
	if(publicationsString != null) {
		publications = publicationsString.replace(/\s/g, "").split(/,/);
	}
	
	_.each(publications, function(publicationId) {
		glue.command(["create", "custom-table-row", "hdr_ras_publication", rowIdx+":"+publicationId]);
		glue.inMode("custom-table-row/hdr_ras_publication/"+rowIdx+":"+publicationId, function() {
			glue.command(["set", "link-target", "hdr_publication", "custom-table-row/hdr_publication/"+publicationId]);
			glue.command(["set", "link-target", "hdr_ras", "custom-table-row/hdr_ras/"+rowIdx]);
		});
		
	});

	
	
	var mutationString = drRowObj["Mutation"].replace(/\s/g, "").replaceAll("rt", "");
	var alternatives = mutationString.split(",");
	var altIdx = 1;
	_.each(alternatives, function(altMutation) {
		var parts = altMutation.trim().split(/[\+±]/);
		// glue.logInfo("ID: "+rowIdx+"_"+altIdx+", parts:", parts);
		var partIdx = 1;
		var partVariationNames = [];
		_.each(parts, function(part) {
			var variationName;
			if(parts.length > 1) {
				variationName = "hdr_ras:"+rowIdx+"_"+altIdx+"_"+partIdx;
				partVariationNames.push(variationName);
			} else {
				variationName = "hdr_ras:"+rowIdx+"_"+altIdx;
			};
			var matches = part.replaceAll("/", "").match(/([A-Z]?)([0-9]+)([A-Z]*)/);
			var wildTypeAA = matches[1];
			var codonLabel = matches[2];
			var mutationAAs = matches[3]
			var regexAaPattern;
			if(mutationAAs.length == 0) {
				if(wildTypeAA.length != 1) {
					throw new Error("If mutation AAs not specified, wildtype must be single AA");
				}
				regexAaPattern = "[^"+wildTypeAA+"]";
			} else {
				regexAaPattern = "["+mutationAAs+"]";
			}
			
			// glue.logInfo("wildTypeAA: "+wildTypeAA+", codonLabel: "+codonLabel+", mutationAAs: "+mutationAAs);
			glue.inMode("reference/REF_MASTER_NC_003977/feature-location/RT", function() {
				glue.command(["create", "variation", variationName, 
					"--vtype", "aminoAcidRegexPolymorphism", 
					"--description", part,
					"--labeledCodon", codonLabel, codonLabel]);
				glue.inMode("variation/"+variationName, function() {
					glue.command(["set", "metatag", "REGEX_AA_PATTERN", regexAaPattern]);
					if(parts.length == 1) {
						glue.command(["set", "link-target", "hdr_ras", "custom-table-row/hdr_ras/"+rowIdx]);
					}
				});
			});
			partIdx++;
		});
		if(parts.length > 1) {
			var conjunctionVariationName = "hdr_ras:"+rowIdx+"_"+altIdx;
			glue.inMode("reference/REF_MASTER_NC_003977/feature-location/RT", function() {
				glue.command(["create", "variation", conjunctionVariationName, 
					"--vtype", "conjunction", 
					"--description", mutationString.replace(/\s/g, "")]);
				glue.inMode("variation/"+conjunctionVariationName, function() {
					for(var i = 1; i <= partVariationNames.length; i++) {
						glue.command(["set", "metatag", "CONJUNCT_NAME_"+i, partVariationNames[i-1]]);
						glue.command(["set", "link-target", "hdr_ras", "custom-table-row/hdr_ras/"+rowIdx]);
					}
				});
			});
		}
		altIdx++;
	});
	
	
	rowIdx++;
});

var veRowObjs;
rowIdx = 2;

glue.inMode("module/tabularUtilityTab", function() {
	veRowObjs = glue.tableToObjects(glue.command(["load-tabular", "tabular/VaccineEscapeAlessaReformatted.txt"]));
});

_.each(veRowObjs, function(veRowObj) {
	// glue.logInfo("veRowObj", veRowObj);
	
	glue.command(["create", "custom-table-row", "hdr_vem", rowIdx]);

	var genotypesString = veRowObj["Genotype"];
	var genotypes = [];
	if(genotypesString != null) {
		genotypes = genotypesString.replace(/\s/g, "").split(/,/);
	}
	if(genotypes.length == 0) {
		glue.command(["create", "custom-table-row", "hdr_vem_alignment", rowIdx+":MASTER"]);
		glue.inMode("custom-table-row/hdr_vem_alignment/"+rowIdx+":MASTER", function() {
			glue.command(["set", "link-target", "alignment", "alignment/AL_MASTER"]);
			glue.command(["set", "link-target", "hdr_vem", "custom-table-row/hdr_vem/"+rowIdx]);
		});
	} else {
		_.each(genotypes, function(genotype) {
			glue.command(["create", "custom-table-row", "hdr_vem_alignment", rowIdx+":"+genotype]);
			glue.inMode("custom-table-row/hdr_vem_alignment/"+rowIdx+":"+genotype, function() {
				glue.command(["set", "link-target", "alignment", "alignment/AL_"+genotype]);
				glue.command(["set", "link-target", "hdr_vem", "custom-table-row/hdr_vem/"+rowIdx]);
			});
		});
	}

	

	var publicationsString = veRowObj["References"];
	var publications = [];
	if(publicationsString != null) {
		publications = publicationsString.replace(/\s/g, "").split(/,/);
	}
	
	
	_.each(publications, function(publicationId) {
		glue.command(["create", "custom-table-row", "hdr_vem_publication", rowIdx+":"+publicationId]);
		glue.inMode("custom-table-row/hdr_vem_publication/"+rowIdx+":"+publicationId, function() {
			glue.command(["set", "link-target", "hdr_publication", "custom-table-row/hdr_publication/"+publicationId]);
			glue.command(["set", "link-target", "hdr_vem", "custom-table-row/hdr_vem/"+rowIdx]);
		});
		
	});

	
	var geneString = veRowObj["Gene"].trim();
	var codonLabel = veRowObj["Amino Acid Position"].trim();
	var nativeAA = veRowObj["Native Amino Acid"].trim();
	var mutationString = veRowObj["Escape Mutation"].replace(/\s/g, "");
	var variationName = "hdr_vem:"+rowIdx;
	glue.inMode("reference/REF_MASTER_NC_003977/feature-location/"+geneString, function() {
		glue.command(["create", "variation", variationName, 
			"--vtype", "aminoAcidRegexPolymorphism", 
			"--description", nativeAA+codonLabel+mutationString,
			"--labeledCodon", codonLabel, codonLabel]);
		glue.inMode("variation/"+variationName, function() {
			glue.command(["set", "metatag", "REGEX_AA_PATTERN", "["+mutationString.replaceAll("/", "")+"]"]);
			glue.command(["set", "link-target", "hdr_vem", "custom-table-row/hdr_vem/"+rowIdx]);
		});
	});
	
	rowIdx++;
});






