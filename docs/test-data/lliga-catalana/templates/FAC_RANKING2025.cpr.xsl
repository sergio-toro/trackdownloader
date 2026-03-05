<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <!--  To see the input used for this xslt, check the "Create source.xml file 
        when creating report" menu item under the "Reports" menu in FsComp.
        When checked a .source.xml file is created each time you create a report.
        It shows the actual xml input to the xslt processor.
        This is helpfull if you like to modify this file.
  -->

  <xsl:output method="html" encoding="utf-8" indent="yes" />

  <!--  Set the decimal separator to be used (. or ,) when decimal data is displayed.
        All decimal data in the source is with . and will be displayed with . unless
        formated otherwise using format-number() function.
  -->
  <xsl:variable name="decimal_separator" select="'.'"/>
  <xsl:decimal-format decimal-separator='.' grouping-separator=' ' />
  <!-- note! make sure both above use same, ie either . or ,!! -->

  <!--  All <xsl:param ... elements will show as a field in a report dialog in 
        FS when creating reports. This means you can define param elements here 
        with a default value and set the value from FS when creating report.
        Some is used simply to display text at the top of the report (ie status), 
        others is used to filter the results (ie women_only, nation, ...).
        If you add filter params you must of course also change the "filter"
        definition below so that the filter params is applied.
				20080518 FS 1.2.3: 
				Removed all "filter" params.
				Moved filtering inside FS so the xml input to the xslt is already filtered.
				the filter_info attribute of FsTaskResults element shows what filter(s) is applied.
  -->
  <xsl:param name="title">CLASIFICACIÓN PARA RANKING</xsl:param>
  <xsl:param name="status"></xsl:param>
  <!-- filter params -->
  <!--  No of best tasks to use the sum of for each pilot. 
        Default is 'all' which is normally used. -->
  <xsl:param name="top_x_tasks">all</xsl:param>
  <xsl:param name="result_id" select="0"></xsl:param>
  <xsl:param name="tasks" select="0"></xsl:param>

  <!--  The node-set that this variable returns is what is used 
        to create the result list.
        Here some of the params above is used.
  -->
  <xsl:variable name="comp_result" select="/Fs/FsCompetition[1]/FsCompetitionResults/FsCompetitionResult[@top=$top_x_tasks and @id=$result_id and @tasks=$tasks]"/>
  <xsl:variable name="filter" select="$comp_result/FsParticipant"/>
  <xsl:variable name="fai_sanctioning" select="/Fs/FsCompetition[1]/@fai_sanctioning"/>
  <xsl:variable name="task_result_pattern" select="$comp_result/@task_result_pattern"/>
  <xsl:variable name="comp_result_pattern" select="$comp_result/@comp_result_pattern"/>


  <!-- record template, used for each pilot in the ranked list of pilots -->
  <xsl:template name="record">
    <xsl:variable name="pilot_id" select="@id"/>
    <tr class="fs_res_res_row" onmouseover="this.className = 'hover'" onmouseout="this.className='fs_res_res_row'" >
      <td class="fs_res" align="right">
        <xsl:value-of select="@rank"/>
      </td>
      <td class="fs_res">
        <xsl:value-of select="/Fs/FsCompetition/FsParticipants/FsParticipant[@id=$pilot_id]/@CIVLID"/>
      </td>
      <td class="fs_res">
        <xsl:value-of select="/Fs/FsCompetition/FsParticipants/FsParticipant[@id=$pilot_id]/@name"/>
      </td>
      <td class="fs_res">
        <xsl:choose>
          <xsl:when test="/Fs/FsCompetition/FsParticipants/FsParticipant[@id=$pilot_id]/@female=1">F</xsl:when>
          <xsl:otherwise>M</xsl:otherwise>
        </xsl:choose>
      </td>
      <td class="fs_res">
        <xsl:value-of select="/Fs/FsCompetition/FsParticipants/FsParticipant[@id=$pilot_id]/@nat_code_3166_a3"/>
      </td>
      <td class="fs_res" style="font-weight: bold; text-align: right">
        <xsl:value-of select="format-number(@points, $comp_result_pattern)"/>
      </td>
    </tr>
  </xsl:template>

  <xsl:template match="/">
    <html>
      <head>
        <style>
          .hover
          { /* for IE using onmouseover and onmouseout */
          background: yellow;
          }
          tr.fs_res_res_row:hover
          {
          background: yellow;
          }
          div.fs_res
          {
          font-family: Verdana, Arial, Helvetica, sans-serif;
          font-size: xx-small;
          }
          table.fs_res
          {
          border:solid 1px gray;
          border-collapse:collapse;
          font-size: xx-small;
          }
          td.fs_res
          {
          border:solid 1px gray;
          vertical-align:top;
          padding:5px;
          }
          th.fs_res
          {
          border:solid 1px gray;
          vertical-align:center;
          }
        </style>
      </head>
      <body>
        <div>
          <div class="fs_res">
            <h2>
              <xsl:value-of select="/Fs/FsCompetition/@name"/>
            </h2>
          <div class="fs_res" style="display: inline; width:100%;font-size: xx-small;" >
            <i>
              Listado creado el: <xsl:value-of select="$comp_result/@ts"/>
            </i>
          </div>
            <xsl:if test="string-length($title) > 0">
              <h2>
                <xsl:value-of select="$title"/>
              </h2>
            </xsl:if>
            <xsl:choose>
              <xsl:when test="$top_x_tasks='all'">
                <h3>
                  Resultados Totales <xsl:if test="/Fs/FsCompetition/@ftv_factor > 0">
                    (FTV: <xsl:value-of select="100 * /Fs/FsCompetition/@ftv_factor"/>%)
                  </xsl:if>
                </h3>
              </xsl:when>
              <xsl:otherwise>
                <h3>
                  Resultados usando las mejores <xsl:value-of select="$top_x_tasks"/> mangas de cada piloto
                </h3>
              </xsl:otherwise>
            </xsl:choose>
            <p>
              <xsl:value-of select="$status"/>
            </p>
            <xsl:if test="not($result_id = 'overall')">
              <p>
                <b>
                  Los resultados incluyen solo los pilotos que <xsl:value-of select="$result_id"/>
                </b>
              </p>
            </xsl:if>
            <xsl:if test="$top_x_tasks != 'all'">
              <p>
                <b>
                  <xsl:choose>
                    <xsl:when test="$top_x_tasks = 1">
                      Solo se usa la puntuación de la mejor manga de cada piloto para la puntuación total
                    </xsl:when>
                    <xsl:otherwise>
                      Solo se usan las puntuaciones de las mejores <xsl:value-of select="$top_x_tasks"/> ,mangas de cada piloto para la puntuación total.
                    </xsl:otherwise>
                  </xsl:choose>
                </b>
              </p>
            </xsl:if>
            <table class="fs_res">
              <thead>
                <tr class="fs_res_res_row" onmouseover="this.className = 'hover'" onmouseout="this.className='fs_res_res_row'" >
                  <th class="fs_res">#</th>
                  <th class="fs_res">CIVLID</th>
                  <th class="fs_res">Nombre</th>
                  <th class="fs_res"></th>
                  <th class="fs_res">Nac</th>
                  <th class="fs_res">Total</th>
                </tr>
              </thead>
              <xsl:for-each select="$filter">
                <!-- participant rows -->
                <xsl:call-template name="record"/>
              </xsl:for-each>
            </table>
            <br/>
            <br/>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
