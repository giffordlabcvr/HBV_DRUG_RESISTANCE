<html>
<head>
<meta charset="UTF-8">
<style>
${getResourceAsString('hdrRasReportTransformer.css')?no_esc}
</style>
</head>
<body>

<#assign pubIdToIdx = {}>
<#assign pubIdToPubHash = {}>
<#assign nextPubIdx = 1>

<h2>Hepatitis B virus sequence report</h2>

<#list hdrReportingResult.sequenceResults as sequenceResult>

<h4>Sequence ${sequenceResult.sequenceID}</h4>

<p>
<table>
<colgroup>
    <col class="tableHeader"/>
    <col/>
</colgroup>

<tr>
<td><b>Genotype</b></td>
<#if sequenceResult.genotypingStatus = "RESOLVED">
<td>${sequenceResult.genotype}</td>
<#else>
<td>Unknown</td>
</#if>
</tr>

<tr>
<td><b>Reverse complement?</b></td>
<#if sequenceResult.directionStatus = "RESOLVED">
<#if sequenceResult.direction = "FORWARD"><td>No</td></#if>
<#if sequenceResult.direction = "REVERSE"><td>Yes</td></#if>
<#else>
<td>Unknown</td>
</#if>
</tr>

<tr>
<td><b>Rightward nucleotide rotation</b></td>
<#if sequenceResult.rotationStatus = "RESOLVED">
<td>${sequenceResult.rotationNts?c}</td>
<#else>
<td>Unknown</td>
</#if>
</tr>
</table>
</p>

<p>
<#if sequenceResult.detectedSubstitutions?size gt 0>
<table>
<tr class="tableHeader">
  <td><b>Resistant substitution</b></td>
  <td><b>Resisted drug</b></td>
  <td><b>Genotypes</b></td>
  <td><b>References</b></td>
</tr>
<#list sequenceResult.detectedSubstitutions as substitution>
<tr>
<td>${substitution.virusDomain?lower_case}${substitution.description}</td>
<td>
${substitution.drug.name} (${substitution.drug.abbreviatedName})
</td>
<td>
<#list substitution.clade as clade>
<#if clade.name = 'AL_MASTER'>All genotypes<#else>${clade.displayName?replace('Genotype ', '')}</#if><#if !clade?is_last>,</#if>
</#list>
</td>
<td>
<#list substitution.publication as publication>
<#if pubIdToIdx[publication.id]??>
<#assign pubIndex = pubIdToIdx[publication.id]>
<#else>
<#assign pubIndex = nextPubIdx>
<#assign pubIdToIdx = pubIdToIdx+{publication.id: pubIndex}>
<#assign pubIdToPubHash = pubIdToPubHash+{publication.id: publication}>
<#assign nextPubIdx = nextPubIdx+1>
</#if>
<a target="_blank" href="${publication.url}">${publication.authorsShort} ${publication.year}</a> [${pubIndex}]<#if !publication?is_last>,</#if>
</#list>
</td>
</tr>
</#list>
</table>
<#else>
No resistant substitutions found
</#if>
</p>

</#list>

<#if pubIdToIdx?size gt 0>
<h4>References</h4>
<small>
<#list pubIdToIdx as pubId, pubIdx>
<#assign publication = pubIdToPubHash[pubId]>
<p>
[${pubIdx}] 
<b>${publication.title}</b>
<br/>
${publication.authorsFull}, 
${publication.journal}
<#if publication.volume?? && publication.issue??>
	${publication.volume}(${publication.issue}),
<#elseif publication.volume??>
	${publication.volume},
</#if>
<#if publication.pages??>
	${publication.pages}
</#if>
(${publication.year})
<br/>
<a target="_blank" href="${publication.url}">${publication.url}</a> 
</p>
</#list>
</small>
</#if>

</body>
</html>