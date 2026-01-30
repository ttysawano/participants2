<?php
/* SPDX-License-Identifier: MIT
 * (c) 2026 Tatsuya Sawano
 */

if(!defined('DOKU_INC')) die();

class syntax_plugin_participants2_participants2 extends DokuWiki_Syntax_Plugin {
    public function getType() { return 'protected'; }
    public function getPType(){ return 'block'; }
    public function getSort() { return 198; }

    public function connectTo($mode) {
        $this->Lexer->addSpecialPattern('<participants2>[\s\S]*?</participants2>', $mode, 'plugin_participants2_participants2');
    }

    public function handle($match, $state, $pos, Doku_Handler $handler) {
        // Extract <person>…</person> names in order
        $inner = preg_replace('#^<participants2>|</participants2>$#', '', $match);
        preg_match_all('#<person>\s*(.*?)\s*</person>#u', $inner, $m);
        $names = array();
        foreach($m[1] as $n){
            $n = trim($n);
            if($n !== '') $names[] = $n;
        }
        return array('names' => $names);
    }

    public function render($mode, Doku_Renderer $R, $data) {
        if($mode !== 'xhtml') return false;
        global $ID;

        // Avoid stale sectok being baked into cached HTML
        $R->nocache();
        $R->info['cache'] = false;

        /** @var helper_plugin_participants2_storage $store */
        $store = plugin_load('helper','participants2_storage');
        if(!$store) return false;

        $rows  = $store->load($ID);
        $names = $data['names'];

        // ensure data exists (default: absent)
        foreach($names as $nm){
            if(!isset($rows[$nm])) {
                $rows[$nm] = ['status'=>'absent','description'=>''];
            } else {
                if(!isset($rows[$nm]['status'])) $rows[$nm]['status'] = 'absent';
                if(!isset($rows[$nm]['description'])) $rows[$nm]['description'] = '';
            }
        }

        $canEdit = auth_quickaclcheck($ID) >= AUTH_EDIT;

        $title = $this->getLang('frame_title') ?: 'participants';
        $hint  = $this->getLang('click_hint') ?: '';
        $presentLabel = $this->getLang('present_label') ?: 'present';
        $absentLabel  = $this->getLang('absent_label')  ?: 'absent';
        $commentHeading = $this->getLang('comment_heading') ?: 'Attendance comments';
        $exportButton = $this->getLang('export_button') ?: 'Export…';
        $updateButton = $this->getLang('update_button') ?: 'Update interval';

        // root
        $R->doc .= '<div class="participants2-root" data-pageid="'.hsc($ID).'" data-sectok="'.hsc(getSecurityToken()).'" data-canedit="'.($canEdit? '1':'0').'">';
        $R->doc .= '<div class="participants2-container"><div class="participants2-frame">';
        $R->doc .= '<span class="participants2-title">'.hsc($title).'</span>';
        if($hint) $R->doc .= '<div class="participants2-hint">'.hsc($hint).'</div>';

        // List
        $R->doc .= '<div class="participants2-list">';
        foreach($names as $nm){
            $st = $rows[$nm]['status'];
            $desc = $rows[$nm]['description'];
            $cls = ($st === 'present') ? 'is-present' : 'is-absent';
            $label = ($st === 'present') ? $presentLabel : $absentLabel;
            $R->doc .= '<div class="pp2-name '.$cls.'" data-name="'.hsc($nm).'" data-status="'.hsc($st).'" data-desc="'.hsc($desc).'" data-title="'.hsc($label).'">'.hsc($nm).'</div>';
        }
        $R->doc .= '</div>'; // list

        // Export button
        $R->doc .= '<div class="participants2-export">';
        $R->doc .= '<button type="button" class="pp2-btn" data-pp2-export="1">'.hsc($exportButton).'</button>';
        $R->doc .= '<button type="button" class="pp2-btn" data-pp2-interval="1">'.hsc($updateButton).'</button>';
        $R->doc .= '</div>';

        // Comments (only non-empty)
        $R->doc .= '<div class="participants2-comments"><p>'.hsc($commentHeading).'</p>';
        foreach($names as $nm){
            $desc = trim($rows[$nm]['description']);
            if($desc !== ''){
                $R->doc .= '<p>'.hsc($nm).': '.hsc($desc).'</p>';
            }
        }
        $R->doc .= '</div>'; // comments

        $R->doc .= '</div></div>'; // frame/container
        // i18n blob for JS
        $i18n = array(
            'dlg_title' => $this->getLang('dlg_title'),
            'dlg_status'=> $this->getLang('dlg_status'),
            'dlg_desc'  => $this->getLang('dlg_desc'),
            'dlg_save'  => $this->getLang('dlg_save'),
            'dlg_cancel'=> $this->getLang('dlg_cancel'),
            'present_label' => $presentLabel,
            'absent_label'  => $absentLabel,
            'comment_heading' => $commentHeading,
            'no_permission' => $this->getLang('no_permission'),
            'export_button' => $exportButton,
            'export_title' => $this->getLang('export_title'),
            'export_range' => $this->getLang('export_range'),
            'export_present' => $this->getLang('export_present'),
            'export_absent' => $this->getLang('export_absent'),
            'export_name_mode' => $this->getLang('export_name_mode'),
            'export_full' => $this->getLang('export_full'),
            'export_first' => $this->getLang('export_first'),
            'export_delim' => $this->getLang('export_delim'),
            'export_space' => $this->getLang('export_space'),
            'export_comma' => $this->getLang('export_comma'),
            'export_newline' => $this->getLang('export_newline'),
            'export_run' => $this->getLang('export_run'),
            'export_copy' => $this->getLang('export_copy'),
            'export_copied' => $this->getLang('export_copied'),
            'export_output' => $this->getLang('export_output'),
            'update_button' => $updateButton,
            'update_title' => $this->getLang('update_title'),
            'update_manual' => $this->getLang('update_manual'),
            'update_10' => $this->getLang('update_10'),
            'update_30' => $this->getLang('update_30'),
            'update_60' => $this->getLang('update_60'),
            'update_now' => $this->getLang('update_now'),
        );
        $R->doc .= '<script type="application/x-participants2-i18n">'.hsc(json_encode($i18n, JSON_UNESCAPED_UNICODE)).'</script>';
        $R->doc .= '<script src="'.DOKU_BASE.'lib/plugins/participants2/script.js"></script>';
        $R->doc .= '<link rel="stylesheet" href="'.DOKU_BASE.'lib/plugins/participants2/style.css?v=20250828" />';

        $R->doc .= '</div>'; // root

        return true;
    }
}
