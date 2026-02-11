#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
TOP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

print_help() {
  cat <<EOS

Environment Management
======================
Tools for encrypting and decrypting environment files using SOPS.

Usage:   env [command] {environment}

Commands
--------

  encrypt {staging|production|all}
      Encrypts plain .env files to .enc.env files using SOPS
        staging:    encrypts .env.staging to .enc.env.staging
        production: encrypts .env.production to .enc.env.production
        all:        encrypts both staging and production files

  decrypt {staging|production|all}
      Decrypts .enc.env files to plain .env files using SOPS
        staging:    decrypts .enc.env.staging to .env.staging
        production: decrypts .enc.env.production to .env.production
        all:        decrypts both staging and production files

  edit {staging|production}
      Opens the encrypted .enc.env file in your default editor
        staging:    edits .enc.env.staging
        production: edits .enc.env.production

Examples
--------
  env encrypt staging     # Encrypt staging environment
  env decrypt production  # Decrypt production environment
  env edit staging        # Edit encrypted staging file
  env encrypt all         # Encrypt both environments

EOS
}

do_encrypt() {
  local env=$1
  local source_file="${TOP_DIR}/.env.${env}"
  local target_file="${TOP_DIR}/.enc.env.${env}"

  if [ ! -f "$source_file" ]; then
    echo "Error: Source file ${source_file} does not exist"
    return 1
  fi

  sops -e --input-type dotenv --output-type dotenv "$source_file" >| "$target_file"
  echo "Successfully encrypted ${source_file} to ${target_file}"
}

do_decrypt() {
  local env=$1
  local source_file="${TOP_DIR}/.enc.env.${env}"
  local target_file="${TOP_DIR}/.env.${env}"

  if [ ! -f "$source_file" ]; then
    echo "Error: Encrypted file ${source_file} does not exist"
    return 1
  fi

  sops -d --input-type dotenv "$source_file" >| "$target_file"
  echo "Successfully decrypted ${source_file} to ${target_file}"
}

do_edit() {
  local env=$1
  local file="${TOP_DIR}/.enc.env.${env}"

  if [ ! -f "$file" ]; then
    echo "Error: Encrypted file ${file} does not exist"
    echo "Run 'env encrypt ${env}' first to create the encrypted file"
    return 1
  fi

  sops "$file"
}

case $1 in
  encrypt)
    case $2 in
      staging)
        do_encrypt staging
        ;;
      production)
        do_encrypt production
        ;;
      all)
        do_encrypt staging
        do_encrypt production
        ;;
      *)
        echo "Error: Please specify 'staging', 'production', or 'all'"
        print_help
        exit 1
        ;;
    esac
    ;;
  decrypt)
    case $2 in
      staging)
        do_decrypt staging
        ;;
      production)
        do_decrypt production
        ;;
      all)
        do_decrypt staging
        do_decrypt production
        ;;
      *)
        echo "Error: Please specify 'staging', 'production', or 'all'"
        print_help
        exit 1
        ;;
    esac
    ;;
  edit)
    case $2 in
      staging|production)
        do_edit $2
        ;;
      *)
        echo "Error: Please specify 'staging' or 'production'"
        print_help
        exit 1
        ;;
    esac
    ;;
  *)
    print_help
    ;;
esac
