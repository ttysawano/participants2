<?php
/* SPDX-License-Identifier: MIT
 * (c) 2026 Tatsuya Sawano
 */

if(!defined('DOKU_INC')) die();

class helper_plugin_participants2_storage extends DokuWiki_Plugin {
    private function fn($id){
        // Store under data/meta as <page>.participants2.json
        return metaFN($id, '.participants2.json');
    }

    /** Load rows for a page. @return array name => [status, description] */
    public function load($id){
        $file = $this->fn($id);
        if(file_exists($file)){
            $json = io_readFile($file, false);
            $data = @json_decode($json, true);
            if(is_array($data)) return $data;
        }
        return array();
    }

    /** Save rows back. */
    public function save($id, $rows){
        $file = $this->fn($id);
        // Ensure directory exists
        io_makeFileDir($file);
        $json = json_encode($rows, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
        return io_saveFile($file, $json);
    }
}
